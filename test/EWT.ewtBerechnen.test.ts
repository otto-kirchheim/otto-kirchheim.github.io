import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT, IVorgabenU } from '../src/ts/interfaces';

const {
  getEwtDatenMock,
  calculateEwtEintraegeMock,
  persistEwtTableDataMock,
  aktualisiereBerechnungMock,
  createSnackBarMock,
} = vi.hoisted(() => ({
  getEwtDatenMock: vi.fn(),
  calculateEwtEintraegeMock: vi.fn(),
  persistEwtTableDataMock: vi.fn(),
  aktualisiereBerechnungMock: vi.fn(),
  createSnackBarMock: vi.fn(),
}));

vi.mock('../src/ts/EWT/utils', () => ({
  getEwtDaten: getEwtDatenMock,
  calculateEwtEintraege: calculateEwtEintraegeMock,
  persistEwtTableData: persistEwtTableDataMock,
}));

vi.mock('../src/ts/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

import calculateEwtEintraege from '../src/ts/EWT/utils/calculateEwtEintraege';

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

describe('calculateEwtEintraege', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('wirft Fehler wenn Pflichtdaten fehlen', () => {
    // Bei komplett fehlendem Objekt (null/undefined) -> 'Daten fehlen'
    expect(() => calculateEwtEintraege({} as IVorgabenU, null as never)).toThrow('Daten fehlen');
    expect(() => calculateEwtEintraege(null as never, [createData()])).toThrow('Daten fehlen');
    // Bei leerem Objekt -> 'Vorgaben unvollständig'
    expect(() => calculateEwtEintraege({} as IVorgabenU, [createData()])).toThrow('Vorgaben unvollständig');
  });

  it('wirft Fehler wenn Vorgaben fehlen', () => {
    calculateEwtEintraegeMock.mockReturnValue([createData()]);

    expect(() => calculateEwtEintraege({} as IVorgabenU, [createData()])).toThrow('Vorgaben unvollständig');
  });

  it('berechnet, lädt Tabelle, speichert und zeigt Erfolgssnackbar', () => {
    const daten = [createData('2026-03-10')];
    const mockVorgabenU = {
      aZ: {
        bT: '07:00',
        eT: '15:00',
        eTF: '14:00',
        bN: '22:00',
        eN: '06:00',
        bBN: '20:00',
        bS: '08:00',
        eS: '12:00',
        rZ: '00:30',
      },
      fZ: [{ key: 'Fulda', value: '00:10' }],
      pers: {},
    } as unknown as IVorgabenU;

    const result = calculateEwtEintraege(
      mockVorgabenU,
      daten.map(entry => ({ ...entry })),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        tagE: '2026-03-10',
        beginE: '07:00',
        endeE: '15:00',
        abWE: '06:30',
        ab1E: '07:20',
        anEE: '07:30',
        abEE: '14:30',
        an1E: '14:40',
        anWE: '15:30',
      }),
    );
  });
});
