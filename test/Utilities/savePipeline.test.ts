import { describe, expect, it, vi } from 'bun:test';
import { collectRowErrorMatches, applyServerRowsToTable } from '../../src/ts/infrastructure/autoSave/savePipeline';
import type { CustomTable, CustomTableTypes, Row } from '../../src/ts/class/CustomTable';
import type { BulkErrorEntry } from '../../src/ts/infrastructure/api/apiService';

function makeRow(overrides: Partial<Row<CustomTableTypes>> & { cells?: CustomTableTypes }): Row<CustomTableTypes> {
  return {
    _state: 'unchanged',
    _id: undefined,
    _clientRequestId: undefined,
    _originalCells: {},
    cells: {},
    ...overrides,
  } as unknown as Row<CustomTableTypes>;
}

function makeTable(rows: Row<CustomTableTypes>[]): CustomTable<CustomTableTypes> {
  return {
    rows: { array: rows },
    drawRows: vi.fn(),
  } as unknown as CustomTable<CustomTableTypes>;
}

describe('savePipeline', () => {
  describe('collectRowErrorMatches', () => {
    it('returns empty array when no errors', () => {
      const table = makeTable([makeRow({})]);
      expect(collectRowErrorMatches(table, [])).toEqual([]);
    });

    it('matches create error by clientRequestId', () => {
      const row = makeRow({ _state: 'new', _clientRequestId: 'crid_abc' });
      const table = makeTable([row]);
      const error: BulkErrorEntry = { operation: 'create', message: 'fail', clientRequestId: 'crid_abc' };

      const result = collectRowErrorMatches(table, [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
      expect(result[0].sourceState).toBe('new');
    });

    it('matches update error by _id', () => {
      const row = makeRow({ _state: 'modified', _id: 'id123' });
      const table = makeTable([row]);
      const error: BulkErrorEntry = { operation: 'update', message: 'conflict', id: 'id123' };

      const result = collectRowErrorMatches(table, [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
      expect(result[0].sourceState).toBe('modified');
    });

    it('matches delete error by _id', () => {
      const row = makeRow({ _state: 'deleted', _id: 'id456' });
      const table = makeTable([row]);
      const error: BulkErrorEntry = { operation: 'delete', message: 'not found', id: 'id456' };

      const result = collectRowErrorMatches(table, [error]);
      expect(result).toHaveLength(1);
      expect(result[0].sourceState).toBe('deleted');
    });

    it('skips errors with no matching row', () => {
      const table = makeTable([makeRow({ _id: 'other' })]);
      const error: BulkErrorEntry = { operation: 'update', message: 'gone', id: 'nonexistent' };

      expect(collectRowErrorMatches(table, [error])).toEqual([]);
    });

    it('falls back to _id match when clientRequestId not found', () => {
      const row = makeRow({ _state: 'new', _id: 'id789', _clientRequestId: 'crid_different' });
      const table = makeTable([row]);
      const error: BulkErrorEntry = {
        operation: 'create',
        message: 'dup',
        clientRequestId: 'crid_missing',
        id: 'id789',
      };

      const result = collectRowErrorMatches(table, [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
    });

    it('handles multiple errors across rows', () => {
      const row1 = makeRow({ _state: 'new', _clientRequestId: 'crid_a' });
      const row2 = makeRow({ _state: 'modified', _id: 'id_b' });
      const table = makeTable([row1, row2]);
      const errors: BulkErrorEntry[] = [
        { operation: 'create', message: 'fail1', clientRequestId: 'crid_a' },
        { operation: 'update', message: 'fail2', id: 'id_b' },
      ];

      const result = collectRowErrorMatches(table, errors);
      expect(result).toHaveLength(2);
    });
  });

  describe('applyServerRowsToTable', () => {
    it('does nothing when result is empty', () => {
      const row = makeRow({ _id: 'id1', cells: { name: 'old' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      applyServerRowsToTable('BZ', table, { created: [], updated: [] });
      expect((row.cells as Record<string, unknown>).name).toBe('old');
      expect(table.drawRows).toHaveBeenCalled();
    });

    it('updates row cells from server response', () => {
      const row = makeRow({ _id: 'id1', cells: { beginB: '2026-01-01T00:00:00.000Z' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      const serverDoc = { _id: 'id1', beginB: '2026-01-01T08:00:00.000Z', endeB: '2026-01-01T16:00:00.000Z' };
      applyServerRowsToTable('BZ', table, { updated: [serverDoc] });

      expect((row.cells as Record<string, unknown>)._id).toBe('id1');
      expect(row._originalCells).toBeDefined();
      expect(table.drawRows).toHaveBeenCalled();
    });

    it('skips deleted rows', () => {
      const row = makeRow({ _id: 'id1', _state: 'deleted', cells: { beginB: 'old' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      applyServerRowsToTable('BZ', table, { updated: [{ _id: 'id1', beginB: 'new' }] });
      expect((row.cells as Record<string, unknown>).beginB).toBe('old');
    });

    it('skips rows without _id', () => {
      const row = makeRow({ cells: { beginB: 'old' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      applyServerRowsToTable('BZ', table, { updated: [{ _id: 'srv1', beginB: 'new' }] });
      expect((row.cells as Record<string, unknown>).beginB).toBe('old');
    });
  });
});
