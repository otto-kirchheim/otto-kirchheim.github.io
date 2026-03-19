import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT, IVorgabenU } from '../src/ts/interfaces';

const { dataEMock, berechnenMock, saveTableDataEWTMock, aktualisiereBerechnungMock, createSnackBarMock } = vi.hoisted(
  () => ({
    dataEMock: vi.fn(),
    berechnenMock: vi.fn(),
    saveTableDataEWTMock: vi.fn(),
    aktualisiereBerechnungMock: vi.fn(),
    createSnackBarMock: vi.fn(),
  }),
);

vi.mock('../src/ts/EWT/utils', () => ({
  DataE: dataEMock,
  berechnen: berechnenMock,
  saveTableDataEWT: saveTableDataEWTMock,
}));

vi.mock('../src/ts/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

import ewtBerechnen from '../src/ts/EWT/utils/ewtBerechnen';

function createData(day = '2026-03-10'): IDatenEWT {
  return {
    tagE: day,
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

describe('ewtBerechnen', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('wirft Fehler wenn Pflichtdaten fehlen', () => {
    expect(() => ewtBerechnen({ monat: 0, jahr: 2026, daten: [createData()], vorgabenU: {} as IVorgabenU })).toThrow(
      'Daten fehlen',
    );
    expect(() => ewtBerechnen({ monat: 3, jahr: 0, daten: [createData()], vorgabenU: {} as IVorgabenU })).toThrow(
      'Daten fehlen',
    );
    expect(() => ewtBerechnen({ monat: 3, jahr: 2026, daten: null as never, vorgabenU: {} as IVorgabenU })).toThrow(
      'Daten fehlen',
    );
    expect(() => ewtBerechnen({ monat: 3, jahr: 2026, daten: [createData()], vorgabenU: null as never })).toThrow(
      'Daten fehlen',
    );
  });

  it('wirft Fehler wenn Tabelle fehlt', () => {
    berechnenMock.mockReturnValue([createData()]);

    expect(() =>
      ewtBerechnen({
        monat: 3,
        jahr: 2026,
        daten: [createData()],
        vorgabenU: {} as IVorgabenU,
      }),
    ).toThrow('Tabelle nicht gefunden');
  });

  it('berechnet, laedt Tabelle, speichert und zeigt Erfolgssnackbar', () => {
    const daten = [createData('2026-03-10')];
    const berechneteDaten = [createData('2026-03-11')];
    const geladeneTabelle = [{ foo: 'bar' }];

    berechnenMock.mockReturnValue(berechneteDaten);
    dataEMock.mockReturnValue(geladeneTabelle);

    const loadMock = vi.fn();
    const ftE = {
      rows: {
        load: loadMock,
      },
    };

    const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftE };
    table.id = 'tableE';
    table.instance = ftE;
    document.body.appendChild(table);

    ewtBerechnen({
      monat: 3,
      jahr: 2026,
      daten,
      vorgabenU: {} as IVorgabenU,
    });

    expect(berechnenMock).toHaveBeenCalledTimes(1);
    expect(berechnenMock).toHaveBeenCalledWith({} as IVorgabenU, expect.any(Array));

    const berechnenArg = berechnenMock.mock.calls[0][1];
    expect(berechnenArg).toEqual(daten);
    expect(berechnenArg).not.toBe(daten);

    expect(dataEMock).toHaveBeenCalledWith(berechneteDaten, 3);
    expect(loadMock).toHaveBeenCalledWith(geladeneTabelle);
    expect(saveTableDataEWTMock).toHaveBeenCalledWith(ftE, 3);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledWith(2026);
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'EWT<br/>Zeiten berechnet.', status: 'success' }),
    );
  });
});
