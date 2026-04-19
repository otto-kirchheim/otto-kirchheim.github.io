import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT } from '../src/ts/interfaces';
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

import persistEwtTableData from '../src/ts/infrastructure/data/persistEwtTableData';

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
});
