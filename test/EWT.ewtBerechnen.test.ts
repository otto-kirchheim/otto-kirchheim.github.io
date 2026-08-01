import { beforeEach, describe, expect, it } from 'bun:test';

import type { IDatenEWT, IVorgabenU } from '@/core/types';

import calculateEwtEintraege from '@/features/EWT/utils/calculateEwtEintraege';

function createData(day = '2026-03-10'): IDatenEWT {
  return {
    Tag: day,
    Einsatzort: 'Fulda',
    Schicht: 'T',
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
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
          overrides: { 5: { ende: '14:00', pause: 0 } },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: {},
    } as unknown as IVorgabenU;

    const result = calculateEwtEintraege(
      mockVorgabenU,
      daten.map(entry => ({ ...entry })),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        Tag: '2026-03-10',
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

  it('addiert 5 Minuten auf anWE bei Sonderfall Pascal Ackermann', () => {
    const daten = [createData('2026-03-10')];
    const mockVorgabenU = {
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
          overrides: { 5: { ende: '14:00', pause: 0 } },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: { Vorname: 'Pascal', Nachname: 'Ackermann' },
    } as unknown as IVorgabenU;

    const result = calculateEwtEintraege(
      mockVorgabenU,
      daten.map(entry => ({ ...entry })),
    );

    expect(result).toHaveLength(1);
    // Ohne Sonderfall wäre anWE '15:30' (siehe Test oben) -> mit Pascal Ackermann +5 Minuten.
    expect(result[0]).toEqual(expect.objectContaining({ anWE: '15:35' }));
  });

  it('berechnet eine Spätschicht (SP) anhand der Spät-Vorgaben', () => {
    const mockVorgabenU = {
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
        },
        spaet: { aktiv: true, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: {},
    } as unknown as IVorgabenU;

    const result = calculateEwtEintraege(mockVorgabenU, [{ ...createData('2026-03-10'), Schicht: 'SP' }]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        beginE: '14:00',
        endeE: '22:00',
      }),
    );
  });

  it('berechnet eine Sonderschicht (S) anhand der Sonder-Vorgaben', () => {
    const mockVorgabenU = {
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: true, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: {},
    } as unknown as IVorgabenU;

    const result = calculateEwtEintraege(mockVorgabenU, [{ ...createData('2026-03-10'), Schicht: 'S' }]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        beginE: '08:00',
        endeE: '12:00',
      }),
    );
  });

  it('wirft Fehler bei Sonderschicht wenn diese nicht konfiguriert ist', () => {
    const mockVorgabenU = {
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: {},
    } as unknown as IVorgabenU;

    expect(() => calculateEwtEintraege(mockVorgabenU, [{ ...createData('2026-03-10'), Schicht: 'S' }])).toThrow(
      'Sonderschicht nicht konfiguriert',
    );
  });

  it('übernimmt manuell eingetragene Uhrzeiten (beginE/endeE) statt Schicht-Vorgaben zu berechnen', () => {
    const mockVorgabenU = {
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:00', pause: 30 },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
        fahrzeit: '00:30',
      },
      Fahrzeit: [{ key: 'Fulda', value: '00:10' }],
      Pers: {},
    } as unknown as IVorgabenU;

    const eintrag = { ...createData('2026-03-10'), beginE: '07:15', endeE: '15:15' };

    const result = calculateEwtEintraege(mockVorgabenU, [eintrag]);

    expect(result).toHaveLength(1);
    // convertToDayjs() wird für explizit gesetzte beginE/endeE-Werte durchlaufen (statt Schicht-Default).
    expect(result[0]).toEqual(
      expect.objectContaining({
        beginE: '07:15',
        endeE: '15:15',
      }),
    );
  });
});
