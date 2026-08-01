import type { Duration } from 'dayjs/plugin/duration';
import type { IDatenEWT, IVorgabenE, IVorgabenU } from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as getDurationFromTime } from '@/infrastructure/date/getDurationFromTime';
import dayjs from '@/infrastructure/date/configDayjs';
import calculateBuchungstagEwt from '@/infrastructure/date/calculateBuchungstagEwt';

// BN ist Legacy-Alias für N (svzA identisch); SP wird als explizite Spätschicht unterstützt
type SchichtKeys = 'T' | 'SP' | 'N' | 'S';

export default function calculateEwtEintraege(vorgabenU: IVorgabenU, daten: IDatenEWT[]): IDatenEWT[] {
  if (vorgabenU == null || daten == null || !Array.isArray(daten)) {
    throw new Error('Daten fehlen');
  }
  if (
    !('Arbeitszeit' in vorgabenU) ||
    !('Fahrzeit' in vorgabenU) ||
    !vorgabenU.Arbeitszeit ||
    typeof vorgabenU.Arbeitszeit !== 'object' ||
    !vorgabenU.Fahrzeit ||
    !Array.isArray(vorgabenU.Fahrzeit)
  ) {
    throw new Error('Vorgaben unvollständig');
  }
  const { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten } = createHelpers(vorgabenU);

  const vorgabenE = initializeVorgabenE();

  const eOrte = Object.keys(vorgabenE.fZ);

  for (const TagDaten of daten) {
    if (!TagDaten.berechnen) continue;
    const datum = dayjs(TagDaten.Tag);
    const schichtDaten = getSchichtDaten(TagDaten.Schicht as SchichtKeys, datum);

    Object.assign(
      TagDaten,
      calculateTimes(TagDaten, datum, schichtDaten, eOrte.includes(TagDaten.Einsatzort), vorgabenE, getPascalEnde()),
    );
    TagDaten.Buchungstag = calculateBuchungstagEwt(TagDaten);
  }

  return daten;
}

function createHelpers(userSettings: IVorgabenU) {
  const { Arbeitszeit: aZ } = userSettings;

  const getPascalEnde = (): Duration =>
    userSettings.Pers.Vorname === 'Pascal' && userSettings.Pers.Nachname === 'Ackermann'
      ? dayjs.duration(5, 'm')
      : dayjs.duration(0, 'm');

  const getSchichtDaten = (schicht: string, datum: dayjs.Dayjs) => {
    const isoWeekday = datum.isoWeekday();
    const key: SchichtKeys = schicht === 'BN' ? 'N' : (schicht as SchichtKeys);

    switch (key) {
      case 'T': {
        const fruehConfig = resolveSchichtDay(aZ.frueh, isoWeekday);
        const spaetConfig = aZ.spaet.aktiv ? resolveSchichtDay(aZ.spaet, isoWeekday) : null;
        const config = fruehConfig ?? spaetConfig ?? aZ.frueh.default;
        return {
          beginn: getDurationFromTime(config.beginn),
          ende: getDurationFromTime(config.ende),
          svzA: dayjs.duration(20, 'm'),
          svzE: dayjs.duration(20, 'm'),
          overnight: false,
        };
      }
      case 'SP': {
        const spaetConfig = aZ.spaet.aktiv ? resolveSchichtDay(aZ.spaet, isoWeekday) : null;
        const fruehConfig = resolveSchichtDay(aZ.frueh, isoWeekday);
        const config = spaetConfig ?? fruehConfig ?? aZ.frueh.default;
        return {
          beginn: getDurationFromTime(config.beginn),
          ende: getDurationFromTime(config.ende),
          svzA: dayjs.duration(20, 'm'),
          svzE: dayjs.duration(20, 'm'),
          overnight: false,
        };
      }
      case 'N': {
        if (!aZ.nacht.aktiv) throw new Error('Nachtschicht nicht konfiguriert');
        const config = resolveSchichtDay(aZ.nacht, isoWeekday) ?? aZ.nacht.default;
        return {
          beginn: getDurationFromTime(config.beginn),
          ende: getDurationFromTime(config.ende).add(1, 'd'),
          svzA: dayjs.duration(45, 'm'),
          svzE: dayjs.duration(45, 'm'),
          overnight: true,
        };
      }
      case 'S': {
        if (!aZ.sonder.aktiv) throw new Error('Sonderschicht nicht konfiguriert');
        return {
          beginn: getDurationFromTime(aZ.sonder.beginn),
          ende: getDurationFromTime(aZ.sonder.ende),
          svzA: dayjs.duration(20, 'm'),
          svzE: dayjs.duration(20, 'm'),
          overnight: false,
        };
      }
      default:
        throw new Error('Schicht unbekannt');
    }
  };

  const initializeVorgabenE = (): IVorgabenE => {
    const fZ: IVorgabenE['fZ'] = {};
    userSettings.Fahrzeit.forEach(place => {
      fZ[place.key] = getDurationFromTime(place.value);
    });
    return {
      rZ: getDurationFromTime(aZ.fahrzeit),
      fZ,
    };
  };

  const calculateTimes = (
    TagDaten: IDatenEWT,
    datum: dayjs.Dayjs,
    schichtDaten: ReturnType<typeof getSchichtDaten>,
    eOrt: boolean,
    vorgabenE: IVorgabenE,
    endePascal: Duration,
  ) => {
    const convertToDayjs = (value: string, addTag: boolean, Tag: IDatenEWT): dayjs.Dayjs => {
      const [stunden, minuten] = value.split(':');
      let tag = dayjs(Tag.Tag).date();
      if (addTag && ['BN', 'N'].includes(Tag.Schicht ?? '')) tag -= 1;
      return dayjs([datum.year(), datum.month(), tag, +stunden, +minuten, 0, 0]);
    };

    const beginE_dayjs =
      TagDaten.beginE.length === 5 ? convertToDayjs(TagDaten.beginE, false, TagDaten) : datum.add(schichtDaten.beginn);
    const beginE = beginE_dayjs.format('LT');
    const endeE_dayjs =
      TagDaten.endeE.length === 5 ? convertToDayjs(TagDaten.endeE, true, TagDaten) : datum.add(schichtDaten.ende);
    const endeE = endeE_dayjs.format('LT');

    const abWE = TagDaten.abWE.length === 5 ? TagDaten.abWE : beginE_dayjs.subtract(vorgabenE.rZ).format('LT');
    const ab1E_dayjs =
      TagDaten.ab1E.length === 5 ? convertToDayjs(TagDaten.ab1E, false, TagDaten) : beginE_dayjs.add(schichtDaten.svzA);
    const ab1E = ab1E_dayjs.format('LT');

    const an1E_dayjs =
      TagDaten.an1E.length === 5
        ? convertToDayjs(TagDaten.an1E, true, TagDaten)
        : endeE_dayjs.subtract(schichtDaten.svzE);
    const an1E = an1E_dayjs.format('LT');
    const anWE =
      TagDaten.anWE.length === 5 ? TagDaten.anWE : endeE_dayjs.add(vorgabenE.rZ).add(endePascal).format('LT');

    const anEE = !(eOrt && TagDaten.anEE === '')
      ? TagDaten.anEE
      : ab1E_dayjs.add(vorgabenE.fZ[TagDaten.Einsatzort]).format('LT');
    const abEE = !(eOrt && TagDaten.abEE === '')
      ? TagDaten.abEE
      : an1E_dayjs.subtract(vorgabenE.fZ[TagDaten.Einsatzort]).format('LT');

    return { beginE, endeE, abWE, ab1E, an1E, anWE, anEE, abEE };
  };

  return { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten };
}
