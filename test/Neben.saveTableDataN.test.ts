import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenN } from '../src/ts/interfaces';
import Storage from '../src/ts/utilities/Storage';

const { tableToArrayMock, aktualisiereBerechnungMock } = vi.hoisted(() => ({
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

type IDatenNByMonth = Record<number, IDatenN[]>;

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

  it('gibt fuer Jahre < 2024 bestehende Daten unveraendert zurueck', () => {
    const dataN = {
      3: [createData('2023-03-10')],
    } as IDatenNByMonth;

    Storage.set('Jahr', 2023);
    Storage.set('Monat', 3);
    Storage.set('dataN', dataN);

    const result = persistNebengeldTableData({} as never);

    expect(result).toEqual(dataN[3]);
    expect(tableToArrayMock).not.toHaveBeenCalled();
    expect(aktualisiereBerechnungMock).not.toHaveBeenCalled();
  });

  it('aktualisiert dataN fuer Monat aus Storage und triggert Berechnung', () => {
    const dataN = {
      3: [createData('2026-03-10')],
    } as IDatenNByMonth;
    const newRows = [createData('2026-03-11')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 3);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = { getRows: vi.fn() } as never;
    const result = persistNebengeldTableData(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenN[]>('dataN', { check: true })).toEqual(newRows);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
  });

  it('nutzt expliziten Monat-Parameter statt Storage-Monat', () => {
    const dataN = {
      3: [createData('2026-03-10')],
      4: [createData('2026-04-10')],
    } as IDatenNByMonth;
    const newRows = [createData('2026-03-20')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 4);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const result = persistNebengeldTableData({} as never, 3);

    expect(result).toEqual(newRows);
  });
});
