import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT, IDatenEWTJahr } from '../src/ts/interfaces';
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

import saveTableDataEWT from '../src/ts/EWT/utils/saveTableDataEWT';

function createData(tagE: string): IDatenEWT {
  return {
    tagE,
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

describe('saveTableDataEWT', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('aktualisiert dataE fuer Monat aus Storage und triggert Berechnung', () => {
    const dataE = {
      3: [createData('2026-03-10')],
    } as unknown as IDatenEWTJahr;
    const newRows = [createData('2026-03-11')];

    Storage.set('Monat', 3);
    Storage.set('dataE', dataE);
    tableToArrayMock.mockReturnValue(newRows);

    const ftMock = { getRows: vi.fn() } as never;
    const result = saveTableDataEWT(ftMock);

    expect(tableToArrayMock).toHaveBeenCalledWith(ftMock);
    expect(result[3]).toEqual(newRows);
    expect(Storage.get<IDatenEWTJahr>('dataE', { check: true })[3]).toEqual(newRows);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
  });

  it('nutzt expliziten Monat-Parameter statt Storage-Monat', () => {
    const dataE = {
      3: [createData('2026-03-10')],
      4: [createData('2026-04-10')],
    } as unknown as IDatenEWTJahr;
    const newRows = [createData('2026-03-20')];

    Storage.set('Monat', 4);
    Storage.set('dataE', dataE);
    tableToArrayMock.mockReturnValue(newRows);

    const result = saveTableDataEWT({} as never, 3);

    expect(result[3]).toEqual(newRows);
    expect(result[4]).toEqual([createData('2026-04-10')]);
  });
});
