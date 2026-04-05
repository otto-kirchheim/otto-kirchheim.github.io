import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT } from '../src/ts/interfaces';
import Storage from '../src/ts/utilities/Storage';

const { tableToArrayMock, aktualisiereBerechnungMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  tableToArrayMock: vi.fn(),
  aktualisiereBerechnungMock: vi.fn(),
}));

vi.mock('../src/ts/utilities/tableToArray', () => ({
  default: tableToArrayMock,
}));

vi.mock('../src/ts/Berechnung/aktualisiereBerechnung', () => ({
  default: aktualisiereBerechnungMock,
}));

import persistEwtTableData from '../src/ts/EWT/utils/persistEwtTableData';

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

describe('persistEwtTableData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('aktualisiert dataE aus dem Tabellen-FlatArray und triggert Berechnung', () => {
    const dataE: IDatenEWT[] = [createData('2026-03-10')];
    const newRows = [createData('2026-03-11')];

    Storage.set('dataE', dataE);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = { getRows: vi.fn() } as never;
    const result = persistEwtTableData(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual(newRows);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
  });

  it('persistiert FlatArray unabhängig vom aktuellen Storage-Monat', () => {
    const dataE = [createData('2026-03-10'), createData('2026-04-10')];
    const newRows = [createData('2026-03-20')];

    Storage.set('Monat', 4);
    Storage.set('dataE', dataE);
    tableToArrayMock.mockReturnValue(newRows);

    const result = persistEwtTableData({} as never);

    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenEWT[]>('dataE', { check: true })).toEqual(newRows);
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

    const tableRow = { cells: row, _state: 'unchanged' };
    const drawRowsMock = vi.fn();
    const ftMock = {
      getRows: vi.fn(() => [tableRow]),
      drawRows: drawRowsMock,
    } as unknown as Parameters<typeof persistEwtTableData>[0];

    tableToArrayMock.mockImplementation((ft: { getRows: () => Array<{ cells: IDatenEWT }> }) =>
      ft.getRows().map(currentRow => currentRow.cells),
    );

    const result = persistEwtTableData(ftMock);

    expect(result[0]?.buchungstagE).toBe('2026-03-21');
    expect(tableRow.cells.buchungstagE).toBe('2026-03-21');
    expect(drawRowsMock).toHaveBeenCalledTimes(1);
  });
});
