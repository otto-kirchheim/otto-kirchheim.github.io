import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenN, IDatenNJahr } from '../src/ts/interfaces';
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

import saveTableDataN from '../src/ts/Neben/utils/saveTableDataN';

function createData(tagN: string): IDatenN {
  return {
    tagN,
    beginN: '08:00',
    endeN: '10:00',
    anzahl040N: 0,
    auftragN: '',
  };
}

describe('saveTableDataN', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('gibt fuer Jahre < 2024 bestehende Daten unveraendert zurueck', () => {
    const dataN = {
      3: [createData('2023-03-10')],
    } as unknown as IDatenNJahr;

    Storage.set('Jahr', 2023);
    Storage.set('Monat', 3);
    Storage.set('dataN', dataN);

    const result = saveTableDataN({} as never);

    expect(result).toEqual(dataN);
    expect(tableToArrayMock).not.toHaveBeenCalled();
    expect(aktualisiereBerechnungMock).not.toHaveBeenCalled();
  });

  it('aktualisiert dataN fuer Monat aus Storage und triggert Berechnung', () => {
    const dataN = {
      3: [createData('2026-03-10')],
    } as unknown as IDatenNJahr;
    const newRows = [createData('2026-03-11')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 3);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = { getRows: vi.fn() } as never;
    const result = saveTableDataN(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result?.[3]).toEqual(newRows);
    expect(Storage.get<IDatenNJahr>('dataN', { check: true })[3]).toEqual(newRows);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
  });

  it('nutzt expliziten Monat-Parameter statt Storage-Monat', () => {
    const dataN = {
      3: [createData('2026-03-10')],
      4: [createData('2026-04-10')],
    } as unknown as IDatenNJahr;
    const newRows = [createData('2026-03-20')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 4);
    Storage.set('dataN', dataN);
    tableToArrayMock.mockReturnValue(newRows);

    const result = saveTableDataN({} as never, 3);

    expect(result?.[3]).toEqual(newRows);
    expect(result?.[4]).toEqual([createData('2026-04-10')]);
  });
});
