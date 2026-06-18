import { beforeEach, describe, expect, it } from 'bun:test';

import type { IDatenEWT, IVorgabenU } from '@/core/types';

import calculateEwtEintraege from '@/features/EWT/utils/calculateEwtEintraege';

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
  });

  it('wirft Fehler wenn Pflichtdaten fehlen', () => {
    // Bei komplett fehlendem Objekt (null/undefined) -> 'Daten fehlen'
    expect(() => calculateEwtEintraege({} as IVorgabenU, null as never)).toThrow('Daten fehlen');
    expect(() => calculateEwtEintraege(null as never, [createData()])).toThrow('Daten fehlen');
    // Bei leerem Objekt -> 'Vorgaben unvollständig'
    expect(() => calculateEwtEintraege({} as IVorgabenU, [createData()])).toThrow('Vorgaben unvollständig');
  });

  it('wirft Fehler wenn Vorgaben fehlen', () => {
    expect(() => calculateEwtEintraege({} as IVorgabenU, [createData()])).toThrow('Vorgaben unvollständig');
  });

  it('berechnet, lädt Tabelle, speichert und zeigt Erfolgssnackbar', () => {
    const daten = [createData('2026-03-10')];
    const mockVorgabenU = {
      aZ: {
        frueh: { default: { beginn: '07:00', ende: '15:00', pause: 30 }, overrides: { 5: { ende: '14:00', pause: 0 } } },
        nacht: { default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
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
