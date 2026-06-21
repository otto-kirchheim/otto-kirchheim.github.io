import './setupBun';
import { beforeEach, describe, expect, it } from 'bun:test';

import type { IDatenBZ, IVorgabenU } from '@/core/types';
import calculateBereitschaftsZeiten from '@/features/Bereitschaft/utils/calculateBereitschaftsZeiten';
import Storage from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';

function setVorgabenU(): void {
  Storage.set('VorgabenU', {
    aZ: {
      frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
      spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
      nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
      sonder: { aktiv: true, beginn: '20:15', ende: '07:00', pause: 20 },
      fahrzeit: '00:00',
    },
    pers: { Bundesland: 'HE' },
  } as unknown as IVorgabenU);
}

// Di 2026-03-03 + Mi 2026-03-04 (beide Arbeitstage in HE), Fenster 06:00 Di → 17:00 Mi.
const anfang = dayjs('2026-03-03T06:00:00');
const ende = dayjs('2026-03-04T17:00:00');

function beginnZeiten(daten: IDatenBZ[]): string[] {
  return daten.map(d => dayjs(d.beginB).format('HH:mm'));
}

describe('calculateBereitschaftsZeiten – schichtenOverrides werden genutzt', () => {
  beforeEach(() => {
    localStorage.clear();
    setVorgabenU();
  });

  it('verschiebt das Bereitschaftsfenster, wenn ein Früh-Override (Di Ende 16:30) gesetzt ist', () => {
    const ohne = calculateBereitschaftsZeiten(anfang, ende, ende, ende, false, false, false, []);
    const mit = calculateBereitschaftsZeiten(anfang, ende, ende, ende, false, false, false, [], {
      frueh: { overrides: { 2: { ende: '16:30' } } },
    });

    expect(ohne).not.toBe(false);
    expect(mit).not.toBe(false);
    if (!ohne || !mit) throw new Error('Berechnung lieferte false');

    const zeitenOhne = beginnZeiten(ohne);
    const zeitenMit = beginnZeiten(mit);

    // Ohne Override endet die Frühschicht am Di um 15:45 → Bereitschaft beginnt dort.
    expect(zeitenOhne).toContain('15:45');
    expect(zeitenOhne).not.toContain('16:30');

    // Mit Override endet die Frühschicht am Di um 16:30 → das Fenster beginnt entsprechend später.
    expect(zeitenMit).toContain('16:30');
  });

  it('nutzt einen per-Wochentag-Nacht-Override (Ende + Pause) je Wochentag in getNachtSchichten', () => {
    Storage.set('VorgabenU', {
      aZ: {
        frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: true, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
        sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
        fahrzeit: '00:00',
      },
      pers: { Bundesland: 'HE' },
    } as unknown as IVorgabenU);

    // Eine einzelne Mo-Nacht (Mo 19:45 → Di 06:15); Override für Mo (isoWeekday 1): Ende 05:00, Pause 60.
    const bAnf = dayjs('2026-03-02T06:00:00');
    const bEnd = dayjs('2026-03-03T17:00:00');
    const nAnf = dayjs('2026-03-02T19:45:00');
    const nEnd = dayjs('2026-03-03T06:15:00');

    const ohne = calculateBereitschaftsZeiten(bAnf, bEnd, nAnf, nEnd, true, false, false, []);
    const mit = calculateBereitschaftsZeiten(bAnf, bEnd, nAnf, nEnd, true, false, false, [], {
      nacht: { overrides: { 1: { ende: '05:00', pause: 60 } } },
    });

    expect(ohne).not.toBe(false);
    expect(mit).not.toBe(false);
    if (!ohne || !mit) throw new Error('Berechnung lieferte false');

    // Ohne Override endet die Nacht 06:15 → Bereitschaft beginnt dort, nie um 05:00.
    expect(ohne.some(r => dayjs(r.beginB).format('HH:mm') === '05:00')).toBe(false);

    // Mit Override endet die Nacht 05:00 (Bereitschafts-Beginn) und die Pause-Vorgabe ist 60.
    const mitRow = mit.find(r => dayjs(r.beginB).format('HH:mm') === '05:00');
    expect(mitRow).toBeDefined();
    expect(mitRow?.pauseB).toBe(60);
  });

  it('default-Nacht-Override gilt für alle Nächte der Spanne – inkl. der Nacht, die am Endtag endet', () => {
    Storage.set('VorgabenU', {
      aZ: {
        frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: {
          aktiv: true,
          default: { beginn: '19:45', ende: '06:15', pause: 45 },
          regelarbeitstage: [7, 1, 2, 3],
        },
        sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
        fahrzeit: '00:00',
      },
      pers: { Bundesland: 'HE' },
    } as unknown as IVorgabenU);

    // Spanne So → Do: Nächte So, Mo, Di, Mi; die Mi-Nacht endet am Do (Endtag).
    const bAnf = dayjs('2026-03-01T06:00:00');
    const bEnd = dayjs('2026-03-05T17:00:00');
    const nAnf = dayjs('2026-03-01T19:45:00');
    const nEnd = dayjs('2026-03-05T06:15:00');

    const mit = calculateBereitschaftsZeiten(bAnf, bEnd, nAnf, nEnd, true, false, false, [], {
      nacht: { default: { beginn: '19:45', ende: '05:00', pause: 45 } },
    });

    expect(mit).not.toBe(false);
    if (!mit) throw new Error('Berechnung lieferte false');

    const zeiten = mit.map(r => dayjs(r.beginB).format('YYYY-MM-DD HH:mm'));
    // Die am Do endende Nacht (= Mi-Nacht) endet 05:00 → Bereitschaft beginnt dort; keine Nacht endet 06:15.
    expect(zeiten).toContain('2026-03-05 05:00');
    expect(mit.some(r => dayjs(r.beginB).format('HH:mm') === '06:15')).toBe(false);
  });

  it('berücksichtigt Sonderschicht-Zeiten nur im gewählten Zeitraum', () => {
    Storage.set('VorgabenU', {
      aZ: {
        frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
        sonder: { aktiv: true, beginn: '20:15', ende: '07:00', pause: 20 },
        fahrzeit: '00:00',
      },
      pers: { Bundesland: 'HE' },
    } as unknown as IVorgabenU);

    const bAnf = dayjs('2026-03-03T06:00:00');
    const bEnd = dayjs('2026-03-05T07:00:00');

    const result = calculateBereitschaftsZeiten(
      bAnf,
      bEnd,
      bEnd,
      bEnd,
      false,
      false,
      true,
      {
        von: dayjs('2026-03-04T00:00:00'),
        bis: dayjs('2026-03-04T23:59:59'),
      },
      [],
    );

    expect(result).not.toBe(false);
    if (!result) throw new Error('Berechnung lieferte false');

    expect(
      result.some(
        r =>
          dayjs(r.beginB).format('YYYY-MM-DD HH:mm') === '2026-03-03 15:45' &&
          dayjs(r.endeB).format('YYYY-MM-DD HH:mm') === '2026-03-04 20:15' &&
          r.pauseB === 30,
      ),
    ).toBe(true);
    expect(result.some(r => dayjs(r.beginB).format('YYYY-MM-DD HH:mm') === '2026-03-05 07:00' && r.pauseB === 20)).toBe(
      true,
    );
  });
});
