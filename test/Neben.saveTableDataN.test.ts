import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenN } from '../src/ts/interfaces';
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

import persistNebengeldTableData from '../src/ts/Neben/utils/persistNebengeldTableData';

function createData(tagN: string): IDatenN {
  return {
    tagN,
    beginN: '08:00',
    endeN: '10:00',
    anzahl040N: 0,
    auftragN: '',
  };
}

describe('persistNebengeldTableData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('gibt fuer Jahre < 2024 bestehende FlatArray-Daten unveraendert zurueck', () => {
    const dataN: IDatenN[] = [createData('2023-03-10')];

    Storage.set('Jahr', 2023);
    Storage.set('dataN', dataN);

    const result = persistNebengeldTableData({} as never);

    expect(result).toEqual(dataN);
    expect(tableToArrayMock).not.toHaveBeenCalled();
    expect(aktualisiereBerechnungMock).not.toHaveBeenCalled();
  });

  it('aktualisiert dataN aus dem Tabellen-FlatArray und triggert Berechnung', () => {
    const dataN: IDatenN[] = [createData('2026-03-10')];
    const newRows = [createData('2026-03-11')];

    Storage.set('Jahr', 2026);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = { getRows: vi.fn() } as never;
    const result = persistNebengeldTableData(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenN[]>('dataN', { check: true })).toEqual(newRows);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
  });

  it('persistiert die übergebenen Tabellenzeilen unabhängig vom aktuellen Storage-Monat', () => {
    const dataN: IDatenN[] = [createData('2026-03-10'), createData('2026-04-10')];
    const newRows = [createData('2026-03-20')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 4);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const result = persistNebengeldTableData({} as never);

    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenN[]>('dataN', { check: true })).toEqual(newRows);
  });
});
