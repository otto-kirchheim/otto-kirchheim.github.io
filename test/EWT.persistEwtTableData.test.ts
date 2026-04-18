import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT, IDatenN } from '../src/ts/interfaces';
import Storage from '../src/ts/infrastructure/storage/Storage';

const { tableToArrayMock, publishDataChangedMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  tableToArrayMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
}));

vi.mock('../src/ts/infrastructure/data/tableToArray', () => ({
  default: tableToArrayMock,
}));

vi.mock('../src/ts/core', () => ({
  publishDataChanged: publishDataChangedMock,
}));

import persistEwtTableData from '../src/ts/features/EWT/utils/persistEwtTableData';

function createData(tagE: string): IDatenEWT {
  return {
    tagE,
    buchungstagE: tagE,
    eOrtE: 'Fulda',
    schichtE: 'T',
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
    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual(newRows);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
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

    expect(result).toEqual([marchEntry, updatedAprilRows[0]]);
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual([marchEntry, updatedAprilRows[0]]);
  });

  it('synchronisiert einen neu berechneten Buchungstag zurück in die Tabellenzeile', () => {
    const row = {
      ...createData('2026-03-20'),
      schichtE: 'N',
      abWE: '19:25',
      ab1E: '20:30',
      anEE: '20:50',
      beginE: '19:45',
      endeE: '06:15',
      abEE: '05:10',
      an1E: '05:30',
      anWE: '06:35',
      buchungstagE: '2026-03-20',
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

    expect(result[0]?.buchungstagE).toBe('2026-03-21');
    expect(tableRow.cells.buchungstagE).toBe('2026-03-21');
    expect(drawRowsMock).toHaveBeenCalledTimes(1);
  });

  it('entfernt ewtRef bei Soft-Delete noch nicht lokal (Undo-sicher)', () => {
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
        ewtRef: deletedId,
        tagN: '06.04.2026',
        beginN: '07:00',
        endeN: '15:45',
        anzahl040N: 1,
        auftragN: 'A',
      },
      {
        _id: 'n2',
        ewtRef: keptId,
        tagN: '07.04.2026',
        beginN: '07:00',
        endeN: '15:45',
        anzahl040N: 1,
        auftragN: 'B',
      },
    ];

    Storage.set('Monat', 4);
    Storage.set('dataE', [activeRow.cells]);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue([activeRow.cells]);

    persistEwtTableData(ftMock);

    const nextDataN = Storage.get<IDatenN[]>('dataN', { check: true });
    expect(nextDataN[0]?.ewtRef).toBe(deletedId);
    expect(nextDataN[1]?.ewtRef).toBe(keptId);
  });
});
