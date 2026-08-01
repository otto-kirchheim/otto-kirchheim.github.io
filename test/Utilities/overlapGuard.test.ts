import { describe, expect, it } from 'bun:test';
import { findOverlapBlockedRows } from '@/infrastructure/autoSave/overlapGuard';
import type { CustomTable, CustomTableTypes, RowState } from '@/infrastructure/table/CustomTable';

type MockRow = {
  _state: RowState;
  _errorState?: Exclude<RowState, 'error'>;
  cells: Record<string, unknown>;
};

function mockTable(rows: MockRow[]): CustomTable<CustomTableTypes> {
  return { rows: { array: rows } } as unknown as CustomTable<CustomTableTypes>;
}

describe('overlapGuard.findOverlapBlockedRows', () => {
  describe('BZ', () => {
    it('blockiert eine neue Zeile, die sich mit einer ungesyncten Löschung überschneidet', () => {
      const table = mockTable([
        {
          _state: 'deleted',
          cells: { _id: 'old', Beginn: '2026-07-01T08:00:00.000Z', Ende: '2026-07-02T08:00:00.000Z' },
        },
        { _state: 'new', cells: { Beginn: '2026-07-01T12:00:00.000Z', Ende: '2026-07-03T08:00:00.000Z' } },
      ]);

      const blocked = findOverlapBlockedRows('BZ', table);

      expect(blocked).toHaveLength(1);
      expect((blocked[0].cells as Record<string, unknown>).Beginn).toBe('2026-07-01T12:00:00.000Z');
    });

    it('blockiert nicht, wenn sich die Zeitfenster nicht überschneiden', () => {
      const table = mockTable([
        {
          _state: 'deleted',
          cells: { _id: 'old', Beginn: '2026-07-01T08:00:00.000Z', Ende: '2026-07-02T08:00:00.000Z' },
        },
        { _state: 'new', cells: { Beginn: '2026-07-03T08:00:00.000Z', Ende: '2026-07-04T08:00:00.000Z' } },
      ]);

      expect(findOverlapBlockedRows('BZ', table)).toHaveLength(0);
    });

    it('blockiert nichts ohne ausstehende Löschung', () => {
      const table = mockTable([
        { _state: 'new', cells: { Beginn: '2026-07-01T08:00:00.000Z', Ende: '2026-07-02T08:00:00.000Z' } },
      ]);

      expect(findOverlapBlockedRows('BZ', table)).toHaveLength(0);
    });

    it('berücksichtigt auch modifizierte Zeilen und Fehler-Zeilen mit _errorState', () => {
      const table = mockTable([
        {
          _state: 'deleted',
          cells: { _id: 'old', Beginn: '2026-07-01T08:00:00.000Z', Ende: '2026-07-02T08:00:00.000Z' },
        },
        {
          _state: 'error',
          _errorState: 'modified',
          cells: { _id: 'mod', Beginn: '2026-07-01T20:00:00.000Z', Ende: '2026-07-03T00:00:00.000Z' },
        },
      ]);

      const blocked = findOverlapBlockedRows('BZ', table);
      expect(blocked).toHaveLength(1);
    });
  });

  describe('EWT', () => {
    it('blockiert eine neue Zeile, deren Schichtfenster eine ungesyncte Löschung überschneidet', () => {
      const table = mockTable([
        { _state: 'deleted', cells: { _id: 'old', Tag: '2026-07-01', beginE: '08:00', endeE: '16:00' } },
        { _state: 'new', cells: { Tag: '2026-07-01', beginE: '15:00', endeE: '23:00' } },
      ]);

      expect(findOverlapBlockedRows('EWT', table)).toHaveLength(1);
    });

    it('berücksichtigt den Tagesübertrag bei Nachtschichten wie das Backend', () => {
      const table = mockTable([
        { _state: 'deleted', cells: { _id: 'old', Tag: '2026-07-02', beginE: '00:00', endeE: '06:00' } },
        { _state: 'new', cells: { Tag: '2026-07-01', beginE: '22:00', endeE: '06:15' } },
      ]);

      expect(findOverlapBlockedRows('EWT', table)).toHaveLength(1);
    });

    it('blockiert nicht bei unterschiedlichen Tagen ohne Überschneidung', () => {
      const table = mockTable([
        { _state: 'deleted', cells: { _id: 'old', Tag: '2026-07-01', beginE: '08:00', endeE: '16:00' } },
        { _state: 'new', cells: { Tag: '2026-07-05', beginE: '08:00', endeE: '16:00' } },
      ]);

      expect(findOverlapBlockedRows('EWT', table)).toHaveLength(0);
    });
  });

  it('gibt für BE/N immer eine leere Liste zurück (keine sichere Frontend-Replikation der Overlap-Regeln)', () => {
    const table = mockTable([
      { _state: 'deleted', cells: { _id: 'old', Tag: '01.07.2026', Beginn: '08:00', Ende: '16:00' } },
      { _state: 'new', cells: { Tag: '01.07.2026', Beginn: '08:00', Ende: '16:00' } },
    ]);

    expect(findOverlapBlockedRows('BE', table)).toHaveLength(0);
    expect(findOverlapBlockedRows('N', table)).toHaveLength(0);
  });
});
