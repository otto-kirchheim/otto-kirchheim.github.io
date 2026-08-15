import { beforeEach, describe, expect, it, vi } from 'bun:test';
import {
  applyServerRowsToTable,
  collectRowErrorMatches,
  unlinkEaRefsForDeletedEwtIds,
  unlinkNebengeldRefsForDeletedEwtIds,
} from '@/infrastructure/autoSave/savePipeline';
import type { CustomTable, CustomTableTypes, Row } from '@/infrastructure/table/CustomTable';
import type { BulkErrorEntry } from '@/infrastructure/api/apiService';
import Storage from '@/infrastructure/storage/Storage';
import type { IDatenEA, IDatenN } from '@/core/types';

function makeNRow(
  overrides: Partial<{ _state: string; _id: string; EWT: string }> = {},
): Row<CustomTableTypes> & { cells: IDatenN } {
  return {
    _state: overrides._state ?? 'unchanged',
    _id: overrides._id,
    _clientRequestId: undefined,
    _originalCells: {} as IDatenN,
    cells: {
      Tag: '2026-03-01',
      Beginn: '06:00',
      Ende: '14:00',
      Auftragsnummer: '',
      ...(overrides.EWT ? { EWT: overrides.EWT } : {}),
    } as IDatenN,
  } as unknown as Row<CustomTableTypes> & { cells: IDatenN };
}

function mountTableN(rows: (Row<CustomTableTypes> & { cells: IDatenN })[]) {
  const el = document.createElement('table');
  el.id = 'tableN';
  const instance = { rows: { array: rows as Row<CustomTableTypes>[] }, drawRows: vi.fn() };
  (el as HTMLTableElement & { instance: typeof instance }).instance = instance;
  document.body.appendChild(el);
  return instance;
}

function makeEaRow(
  overrides: Partial<{ _state: string; _id: string; EWT: string }> = {},
): Row<CustomTableTypes> & { cells: IDatenEA } {
  return {
    _state: overrides._state ?? 'unchanged',
    _id: overrides._id,
    _clientRequestId: undefined,
    _originalCells: {} as IDatenEA,
    cells: {
      Tag: '2026-03-01',
      Dauer: '02:00',
      Taetigkeit: '',
      Entgeltgruppe: '',
      ...(overrides.EWT ? { EWT: overrides.EWT } : {}),
    } as IDatenEA,
  } as unknown as Row<CustomTableTypes> & { cells: IDatenEA };
}

function mountTableEA(rows: (Row<CustomTableTypes> & { cells: IDatenEA })[]) {
  const el = document.createElement('table');
  el.id = 'tableEA';
  const instance = { rows: { array: rows as Row<CustomTableTypes>[] }, drawRows: vi.fn() };
  (el as HTMLTableElement & { instance: typeof instance }).instance = instance;
  document.body.appendChild(el);
  return instance;
}

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

describe('unlinkNebengeldRefsForDeletedEwtIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns immediately when deletedIds is empty', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' }]);
    const setSpied = vi.spyOn(Storage, 'set');

    unlinkNebengeldRefsForDeletedEwtIds([]);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('removes EWT from matching Storage items', () => {
    Storage.set('dataN', [
      { Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' },
      { Tag: '02', Beginn: '09:00', Ende: '17:00', Auftragsnummer: '', EWT: 'e2' },
    ]);

    unlinkNebengeldRefsForDeletedEwtIds(['e1']);

    const stored = Storage.get<IDatenN[]>('dataN', { default: [] });
    expect(stored[0].EWT).toBeUndefined();
    expect(stored[1].EWT).toBe('e2');
  });

  it('does not write Storage when no refs match', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '' }]);
    const setSpied = vi.spyOn(Storage, 'set');

    unlinkNebengeldRefsForDeletedEwtIds(['unknown-id']);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('cleans EWT from live table rows and calls drawRows', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' }]);
    const row = makeNRow({ EWT: 'e1' });
    const instance = mountTableN([row]);

    unlinkNebengeldRefsForDeletedEwtIds(['e1']);

    expect((row.cells as IDatenN).EWT).toBeUndefined();
    expect(instance.drawRows).toHaveBeenCalled();
  });

  it('also updates _originalCells for unchanged rows', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' }]);
    const row = makeNRow({ EWT: 'e1' });
    const instance = mountTableN([row]);

    unlinkNebengeldRefsForDeletedEwtIds(['e1']);

    expect(instance.rows.array[0]._originalCells).toBeDefined();
    expect((instance.rows.array[0]._originalCells as IDatenN).EWT).toBeUndefined();
  });

  it('skips deleted table rows', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' }]);
    const row = makeNRow({ _state: 'deleted', EWT: 'e1' });
    const instance = mountTableN([row]);

    unlinkNebengeldRefsForDeletedEwtIds(['e1']);

    expect((row.cells as IDatenN).EWT).toBe('e1'); // untouched
    expect(instance.drawRows).not.toHaveBeenCalled();
  });

  it('does not crash when #tableN is absent', () => {
    Storage.set('dataN', [{ Tag: '01', Beginn: '08:00', Ende: '16:00', Auftragsnummer: '', EWT: 'e1' }]);
    // No DOM element mounted
    expect(() => unlinkNebengeldRefsForDeletedEwtIds(['e1'])).not.toThrow();
  });
});

describe('unlinkEaRefsForDeletedEwtIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns immediately when deletedIds is empty', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' }]);
    const setSpied = vi.spyOn(Storage, 'set');

    unlinkEaRefsForDeletedEwtIds([]);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('removes EWT from matching Storage items', () => {
    Storage.set('dataEA', [
      { Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' },
      { Tag: '02', Dauer: '01:30', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e2' },
    ]);

    unlinkEaRefsForDeletedEwtIds(['e1']);

    const stored = Storage.get<IDatenEA[]>('dataEA', { default: [] });
    expect(stored[0].EWT).toBeUndefined();
    expect(stored[1].EWT).toBe('e2');
  });

  it('does not write Storage when no refs match', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '' }]);
    const setSpied = vi.spyOn(Storage, 'set');

    unlinkEaRefsForDeletedEwtIds(['unknown-id']);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('cleans EWT from live table rows and calls drawRows', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' }]);
    const row = makeEaRow({ EWT: 'e1' });
    const instance = mountTableEA([row]);

    unlinkEaRefsForDeletedEwtIds(['e1']);

    expect((row.cells as IDatenEA).EWT).toBeUndefined();
    expect(instance.drawRows).toHaveBeenCalled();
  });

  it('also updates _originalCells for unchanged rows', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' }]);
    const row = makeEaRow({ EWT: 'e1' });
    const instance = mountTableEA([row]);

    unlinkEaRefsForDeletedEwtIds(['e1']);

    expect(instance.rows.array[0]._originalCells).toBeDefined();
    expect((instance.rows.array[0]._originalCells as IDatenEA).EWT).toBeUndefined();
  });

  it('skips deleted table rows', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' }]);
    const row = makeEaRow({ _state: 'deleted', EWT: 'e1' });
    const instance = mountTableEA([row]);

    unlinkEaRefsForDeletedEwtIds(['e1']);

    expect((row.cells as IDatenEA).EWT).toBe('e1'); // untouched
    expect(instance.drawRows).not.toHaveBeenCalled();
  });

  it('does not crash when #tableEA is absent', () => {
    Storage.set('dataEA', [{ Tag: '01', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '', EWT: 'e1' }]);
    // No DOM element mounted
    expect(() => unlinkEaRefsForDeletedEwtIds(['e1'])).not.toThrow();
  });
});

describe('savePipeline', () => {
  describe('collectRowErrorMatches', () => {
    it('returns empty array when no errors', () => {
      expect(collectRowErrorMatches([], [], [], [])).toEqual([]);
    });

    it('matches create error by clientRequestId', () => {
      const row = makeRow({ _state: 'new', _clientRequestId: 'crid_abc' });
      const error: BulkErrorEntry = { operation: 'create', message: 'fail', clientRequestId: 'crid_abc' };

      const result = collectRowErrorMatches([row], [], [], [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
      expect(result[0].sourceState).toBe('new');
    });

    it('matches update error by _id', () => {
      const row = makeRow({ _state: 'modified', _id: 'id123' });
      const error: BulkErrorEntry = { operation: 'update', message: 'conflict', id: 'id123' };

      const result = collectRowErrorMatches([], [row], [], [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
      expect(result[0].sourceState).toBe('modified');
    });

    it('matches delete error by _id', () => {
      const row = makeRow({ _state: 'deleted', _id: 'id456' });
      const error: BulkErrorEntry = { operation: 'delete', message: 'not found', id: 'id456' };

      const result = collectRowErrorMatches([], [], [row], [error]);
      expect(result).toHaveLength(1);
      expect(result[0].sourceState).toBe('deleted');
    });

    it('skips errors with no matching row', () => {
      const row = makeRow({ _id: 'other' });
      const error: BulkErrorEntry = { operation: 'update', message: 'gone', id: 'nonexistent' };

      expect(collectRowErrorMatches([], [row], [], [error])).toEqual([]);
    });

    it('falls back to _id match when clientRequestId not found', () => {
      const row = makeRow({ _state: 'new', _id: 'id789', _clientRequestId: 'crid_different' });
      const error: BulkErrorEntry = {
        operation: 'create',
        message: 'dup',
        clientRequestId: 'crid_missing',
        id: 'id789',
      };

      const result = collectRowErrorMatches([row], [], [], [error]);
      expect(result).toHaveLength(1);
      expect(result[0].row).toBe(row);
    });

    it('handles multiple errors across rows', () => {
      const row1 = makeRow({ _state: 'new', _clientRequestId: 'crid_a' });
      const row2 = makeRow({ _state: 'modified', _id: 'id_b' });
      const errors: BulkErrorEntry[] = [
        { operation: 'create', message: 'fail1', clientRequestId: 'crid_a' },
        { operation: 'update', message: 'fail2', id: 'id_b' },
      ];

      const result = collectRowErrorMatches([row1], [row2], [], errors);
      expect(result).toHaveLength(2);
    });

    it('matches create error by index when _state is "new"', () => {
      const row0 = makeRow({ _state: 'new' });
      const row1 = makeRow({ _state: 'new' });
      const errors: BulkErrorEntry[] = [
        { operation: 'create', message: 'err0', index: 0 },
        { operation: 'create', message: 'err1', index: 1 },
      ];

      const result = collectRowErrorMatches([row0, row1], [], [], errors);
      expect(result).toHaveLength(2);
      expect(result[0].row).toBe(row0);
      expect(result[1].row).toBe(row1);
    });

    it('matches error rows (_state="error", _errorState="new") by index on re-save', () => {
      // Rows that failed a previous bulk save sind in 'error'-State mit _errorState='new'.
      // Der Row-Snapshot fuer den naechsten Save-Versuch (getChangeRows) nimmt sie ueber
      // getEffectiveRowState wieder mit auf - hier direkt als createRows-Snapshot simuliert.
      const row0 = makeRow({ _state: 'error', _errorState: 'new' } as Partial<Row<CustomTableTypes>>);
      const row1 = makeRow({ _state: 'error', _errorState: 'new' } as Partial<Row<CustomTableTypes>>);
      const errors: BulkErrorEntry[] = [
        { operation: 'create', message: 'err0', index: 0 },
        { operation: 'create', message: 'err1', index: 1 },
      ];

      const result = collectRowErrorMatches([row0, row1], [], [], errors);
      expect(result).toHaveLength(2);
      expect(result[0].row).toBe(row0);
      expect(result[1].row).toBe(row1);
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
      const row = makeRow({ _id: 'id1', cells: { Beginn: '2026-01-01T00:00:00.000Z' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      const serverDoc = { _id: 'id1', Beginn: '2026-01-01T08:00:00.000Z', Ende: '2026-01-01T16:00:00.000Z' };
      applyServerRowsToTable('BZ', table, { updated: [serverDoc] });

      expect((row.cells as Record<string, unknown>)._id).toBe('id1');
      expect(row._originalCells).toBeDefined();
      expect(table.drawRows).toHaveBeenCalled();
    });

    it('skips deleted rows', () => {
      const row = makeRow({ _id: 'id1', _state: 'deleted', cells: { Beginn: 'old' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      applyServerRowsToTable('BZ', table, { updated: [{ _id: 'id1', Beginn: 'new' }] });
      expect((row.cells as Record<string, unknown>).Beginn).toBe('old');
    });

    it('skips rows without _id', () => {
      const row = makeRow({ cells: { Beginn: 'old' } as unknown as CustomTableTypes });
      const table = makeTable([row]);

      applyServerRowsToTable('BZ', table, { updated: [{ _id: 'srv1', Beginn: 'new' }] });
      expect((row.cells as Record<string, unknown>).Beginn).toBe('old');
    });
  });
});
