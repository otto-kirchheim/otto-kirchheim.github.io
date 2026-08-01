import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT, IDatenN } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage';

const { tableToArrayMock, publishDataChangedMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  tableToArrayMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
}));

vi.mock('@/infrastructure/data/tableToArray', () => ({
  default: tableToArrayMock,
}));

vi.mock('@/core', () => ({
  publishEvent: publishDataChangedMock,
}));

import persistEwtTableData from '@/infrastructure/data/persistEwtTableData';

function createData(Tag: string): IDatenEWT {
  return {
    Tag,
    Buchungstag: Tag,
    Einsatzort: 'Fulda',
    Schicht: 'T',
    abWE: '',
    ab1E: '',
    anEE: '',
    beginE: '',
    endeE: '',
    abEE: '',
    an1E: '',
    anWE: '',
    berechnen: true,
  };
}

function createTableMock(rows: IDatenEWT[]) {
  const tableRows = rows.map(row => ({ cells: row, _state: 'unchanged' as const }));

  return {
    getRows: vi.fn(() => tableRows),
    drawRows: vi.fn(),
    rows: {
      array: tableRows,
      getFilteredRows: vi.fn(() => tableRows),
    },
  } as unknown as Parameters<typeof persistEwtTableData>[0];
}

describe('persistEwtTableData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('aktualisiert dataE aus dem Tabellen-FlatArray und triggert Berechnung', () => {
    const dataE: IDatenEWT[] = [createData('2026-03-10')];
    const newRows = [createData('2026-03-11')];

    Storage.set('Monat', 3);
    Storage.set('dataE', dataE);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = createTableMock(newRows);
    const result = persistEwtTableData(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result).toEqual(newRows.map(row => ({ ...row, __localState: 'unchanged' })));
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual(
      newRows.map(row => ({ ...row, __localState: 'unchanged' })),
    );
    expect(publishDataChangedMock).toHaveBeenCalledTimes(2);
  });

  it('behält andere Monate, wenn nur der ausgewählte Monat neu persistiert wird', () => {
    const marchEntry = createData('2026-03-10');
    const aprilEntry = createData('2026-04-10');
    const updatedAprilRows = [createData('2026-04-20')];

    Storage.set('Monat', 4);
    Storage.set('dataE', [marchEntry, aprilEntry]);
    tableToArrayMock.mockReturnValue(updatedAprilRows);

    const ftMock = createTableMock(updatedAprilRows);
    const result = persistEwtTableData(ftMock);

    // marchEntry ist eine bereits gespeicherte, unveränderte Zeile aus einem anderen Monat (preservedRows) —
    // wird unverändert übernommen, während die aktive April-Zeile frisch über toStorage serialisiert wird.
    const expected = [marchEntry, { ...updatedAprilRows[0], __localState: 'unchanged' }];
    expect(result).toEqual(expected);
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual(expected);
  });

  it('synchronisiert einen neu berechneten Buchungstag zurück in die Tabellenzeile', () => {
    const row = {
      ...createData('2026-03-20'),
      Schicht: 'N',
      abWE: '19:25',
      ab1E: '20:30',
      anEE: '20:50',
      beginE: '19:45',
      endeE: '06:15',
      abEE: '05:10',
      an1E: '05:30',
      anWE: '06:35',
      Buchungstag: '2026-03-20',
    } satisfies IDatenEWT;

    const tableRow = { cells: row, _state: 'unchanged' as const };
    const drawRowsMock = vi.fn();
    const ftMock = {
      getRows: vi.fn(() => [tableRow]),
      drawRows: drawRowsMock,
      rows: {
        array: [tableRow],
        getFilteredRows: vi.fn(() => [tableRow]),
      },
    } as unknown as Parameters<typeof persistEwtTableData>[0];

    tableToArrayMock.mockImplementation((ft: { getRows: () => Array<{ cells: IDatenEWT }> }) =>
      ft.getRows().map(currentRow => currentRow.cells),
    );

    const result = persistEwtTableData(ftMock);

    expect(result[0]?.Buchungstag).toBe('2026-03-21');
    expect(tableRow.cells.Buchungstag).toBe('2026-03-21');
    expect(drawRowsMock).toHaveBeenCalledTimes(1);
  });

  it('entfernt EWT bei Soft-Delete noch nicht lokal (Undo-sicher)', () => {
    const deletedId = 'ewt-delete-1';
    const keptId = 'ewt-keep-1';

    const deletedRow = {
      cells: { ...createData('2026-04-06'), _id: deletedId },
      _state: 'deleted' as const,
      _id: deletedId,
    };
    const activeRow = {
      cells: { ...createData('2026-04-07'), _id: keptId },
      _state: 'unchanged' as const,
      _id: keptId,
    };

    const ftMock = {
      getRows: vi.fn(() => [deletedRow, activeRow]),
      drawRows: vi.fn(),
      rows: {
        array: [deletedRow, activeRow],
        getFilteredRows: vi.fn(() => [deletedRow, activeRow]),
      },
    } as unknown as Parameters<typeof persistEwtTableData>[0];

    const dataN: IDatenN[] = [
      {
        _id: 'n1',
        EWT: deletedId,
        Tag: '06.04.2026',
        Beginn: '07:00',
        Ende: '15:45',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        Auftragsnummer: 'A',
      },
      {
        _id: 'n2',
        EWT: keptId,
        Tag: '07.04.2026',
        Beginn: '07:00',
        Ende: '15:45',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        Auftragsnummer: 'B',
      },
    ];

    Storage.set('Monat', 4);
    Storage.set('dataE', [activeRow.cells]);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue([activeRow.cells]);

    persistEwtTableData(ftMock);

    const nextDataN = Storage.get<IDatenN[]>('dataN', { check: true });
    expect(nextDataN[0]?.EWT).toBe(deletedId);
    expect(nextDataN[1]?.EWT).toBe(keptId);
  });
});
