import type { Dayjs } from 'dayjs';
import type { IDatenBZ, IMonatsDaten, IPerWeekdaySchicht, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as DatenSortieren } from '@/infrastructure/data/DatenSortieren';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { resolveHolidayRegion } from '@/infrastructure/date/holidayRegion';

export const B_WECHSEL_STUNDE = 8;
export const B_WECHSEL_MINUTE = 0;

type Schicht = {
  beginn: Dayjs;
  ende: Dayjs;
  pause: number;
};

function setTimeFromHHMM(baseDate: Dayjs, time: string): Dayjs {
  const [hours, minutes] = time.split(':').map(Number);
  return baseDate
    .set('hour', hours)
    .set('minute', minutes)
    .set('second', 0)
    .set('millisecond', 0);
}

function mergePerWeekdaySchicht(
  base: IPerWeekdaySchicht,
  override?: Partial<IPerWeekdaySchicht>,
): IPerWeekdaySchicht {
  if (!override) return base;

  return {
    ...base,
    ...override,
    default: {
      ...base.default,
      ...(override.default ?? {}),
    },
    overrides: {
      ...(base.overrides ?? {}),
      ...(override.overrides ?? {}),
    },
  };
}

export default function calculateBereitschaftsZeiten(
  bereitschaftsAnfang: Dayjs,
  bereitschaftsEnde: Dayjs,
  nachtAnfang: Dayjs,
  nachtEnde: Dayjs,
  nacht: boolean,
  spaet: boolean,
  daten: IMonatsDaten['BZ'],
  schichtenOverrides?: IVorgabenUvorgabenB['schichtenOverrides'],
): IMonatsDaten['BZ'] | false {
  console.time('Generiere Bereitschaft');

  console.groupCollapsed('Vorgaben');
  console.log('nacht: ' + nacht);
  console.log('spaet: ' + spaet);
  console.log('Bereitschafts Anfang: ' + bereitschaftsAnfang.toDate());
  console.log('Bereitschafts Ende: ' + bereitschaftsEnde.toDate());
  console.log('Nacht Anfang: ' + nachtAnfang.toDate());
  console.log('Nacht Ende: ' + nachtEnde.toDate());
  console.groupEnd();

  let changed: boolean = false;

  // Voreinstellungen Übernehmen
  const datenU: IVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  if (!datenU) throw new Error('VorgabenU nicht gefunden');

  const holidayRegion = resolveHolidayRegion({ bundesland: datenU.pers.Bundesland });

  const datenVorher: number = daten.length;

  // Feste Variablen
  const RUHE_ZEIT: number = 10;
  const NACHT_PAUSEN_VORGABE: number = 45;

  const Arbeitstag = (datum: dayjs.Dayjs, zusatz = 0): boolean => {
    const adjustedDatum = datum.add(zusatz, 'day');
    const isWeekend = adjustedDatum.isoWeekday() > 5;
    const isHoliday = adjustedDatum.isHoliday(holidayRegion);

    return !isWeekend && !isHoliday;
  };

  const getNachtSchichten = (anfang: Dayjs, ende: Dayjs, pausenVorgabe: number): Schicht[] => {
    const schichten: Schicht[] = [];

    let tagAnfang: Dayjs = anfang.startOf('day');

    while (tagAnfang.isBefore(ende, 'day')) {
      const beginn = tagAnfang
        .set('hour', anfang.hour())
        .set('minute', anfang.minute())
        .set('second', 0)
        .set('millisecond', 0);
      const endBase = tagAnfang
        .set('hour', ende.hour())
        .set('minute', ende.minute())
        .set('second', 0)
        .set('millisecond', 0);
      const endeZeit = ende.hour() < anfang.hour() ? endBase.add(1, 'day') : endBase;

      schichten.push({
        beginn,
        ende: endeZeit,
        pause: pausenVorgabe,
      });
      tagAnfang = tagAnfang.add(1, 'day').startOf('day');
    }

    return schichten;
  };

  const getTagSchichten = (anfang: Dayjs, ende: Dayjs, includeSpaet: boolean): Schicht[] => {
    const maxEnde: Dayjs = anfang.add(1, 'month').startOf('month');

    let tagAnfang: Dayjs = anfang.startOf('day');
    const schichten: Schicht[] = [];

    while (tagAnfang.isSameOrBefore(ende, 'day') && tagAnfang.isBefore(maxEnde)) {
      const fruehSchicht = mergePerWeekdaySchicht(datenU.aZ.frueh, schichtenOverrides?.frueh);
      const fruehConfig = resolveSchichtDay(fruehSchicht, tagAnfang.isoWeekday());
      const spaetConfig = includeSpaet && datenU.aZ.spaet
        ? resolveSchichtDay(mergePerWeekdaySchicht(datenU.aZ.spaet, schichtenOverrides?.spaet), tagAnfang.isoWeekday())
        : null;

      const tagSchichten: Schicht[] = [];
      if (Arbeitstag(tagAnfang)) {
        if (fruehConfig) {
          const beginn = setTimeFromHHMM(tagAnfang, fruehConfig.beginn);
          const fruehEndeBase = setTimeFromHHMM(tagAnfang, fruehConfig.ende);
          const fruehEnde = fruehEndeBase.isBefore(beginn) ? fruehEndeBase.add(1, 'day') : fruehEndeBase;
          const pause = nacht && beginn.isBetween(nachtAnfang, nachtEnde) ? 0 : fruehConfig.pause;
          tagSchichten.push({
            beginn,
            ende: fruehEnde,
            pause,
          });
        }
        if (spaetConfig) {
          const spaetBeginn = setTimeFromHHMM(tagAnfang, spaetConfig.beginn);
          const spaetEndeBase = setTimeFromHHMM(tagAnfang, spaetConfig.ende);
          const spaetEnde = spaetEndeBase.isBefore(spaetBeginn) ? spaetEndeBase.add(1, 'day') : spaetEndeBase;
          tagSchichten.push({
            beginn: spaetBeginn,
            ende: spaetEnde,
            pause: spaetConfig.pause,
          });
        }
      }

      if (tagSchichten.length === 0) {
        schichten.push({
          beginn: tagAnfang
            .set('hour', B_WECHSEL_STUNDE)
            .set('minute', B_WECHSEL_MINUTE)
            .set('second', 0)
            .set('millisecond', 0),
          ende: tagAnfang
            .set('hour', B_WECHSEL_STUNDE)
            .set('minute', B_WECHSEL_MINUTE)
            .set('second', 0)
            .set('millisecond', 0),
          pause: 0,
        });
      } else {
        DatenSortieren<Schicht>(tagSchichten, 'beginn');
        const mergedTagSchichten: Schicht[] = [];
        for (const candidate of tagSchichten) {
          const prev = mergedTagSchichten[mergedTagSchichten.length - 1];
          if (!prev || candidate.beginn.isAfter(prev.ende)) {
            mergedTagSchichten.push({ ...candidate });
            continue;
          }

          if (candidate.ende.isAfter(prev.ende)) {
            prev.ende = candidate.ende;
            prev.pause = candidate.pause;
          }
        }

        schichten.push(...mergedTagSchichten);
      }
      tagAnfang = tagAnfang.add(1, 'day').startOf('day');
    }

    return schichten;
  };

  const nachtPause = (() => {
    if (!datenU.aZ.nacht) return NACHT_PAUSEN_VORGABE;
    const nachtSchicht = mergePerWeekdaySchicht(datenU.aZ.nacht, schichtenOverrides?.nacht);
    const resolved = resolveSchichtDay(nachtSchicht, nachtAnfang.isoWeekday());
    return resolved?.pause ?? nachtSchicht.default.pause ?? NACHT_PAUSEN_VORGABE;
  })();
  const nachtSchichten: Schicht[] = nacht ? getNachtSchichten(nachtAnfang, nachtEnde, nachtPause) : [];
  const tagSchichten: Schicht[] = getTagSchichten(bereitschaftsAnfang, bereitschaftsEnde, spaet);

  const kombinierteSchichten: Schicht[] = [...tagSchichten, ...nachtSchichten];
  DatenSortieren<Schicht>(kombinierteSchichten, 'beginn');

  // Prüfen ob bereitschaftsAnfang vor der 1. Schicht ist
  if (bereitschaftsAnfang.isBefore(kombinierteSchichten[0].beginn))
    kombinierteSchichten.unshift({
      beginn: bereitschaftsAnfang,
      ende: bereitschaftsAnfang,
      pause: 0,
    });

  // Prüfen ob bereitschaftsEnde nach der letzten Schicht ist
  if (bereitschaftsEnde.isAfter(kombinierteSchichten[kombinierteSchichten.length - 1].ende))
    kombinierteSchichten.push({
      beginn: bereitschaftsEnde,
      ende: bereitschaftsEnde,
      pause: 0,
    });

  // Prüfen ob bereitschaftsAnfang zwischen Schicht 1 und 2 ist
  if (
    kombinierteSchichten.length > 1 &&
    bereitschaftsAnfang.isBetween(kombinierteSchichten[0].ende, kombinierteSchichten[1].beginn, null, '()')
  )
    kombinierteSchichten.splice(0, 1, {
      beginn: bereitschaftsAnfang,
      ende: bereitschaftsAnfang,
      pause: 0,
    });

  // Prüfen ob bereitschaftsEnde zwischen den letzten Schichten ist
  if (
    kombinierteSchichten.length > 1 &&
    bereitschaftsEnde.isBetween(
      kombinierteSchichten[kombinierteSchichten.length - 2].ende,
      kombinierteSchichten[kombinierteSchichten.length - 1].beginn,
      null,
      '()',
    )
  )
    kombinierteSchichten.splice(-1, 1, {
      beginn: bereitschaftsEnde,
      ende: bereitschaftsEnde,
      pause: 0,
    });

  for (let i = 0; i < kombinierteSchichten.length - 1; i++) {
    const aktuelleSchicht = kombinierteSchichten[i];
    const nächsteSchicht = kombinierteSchichten[i + 1];

    //Prüfen auf ruheZeit
    if (
      nacht &&
      nachtEnde &&
      aktuelleSchicht.ende.hour() === nachtEnde.hour() &&
      aktuelleSchicht.ende.minute() === nachtEnde.minute() &&
      (
        (nächsteSchicht.beginn.hour() === B_WECHSEL_STUNDE
          ? kombinierteSchichten[i + 2]?.beginn
          : nächsteSchicht.beginn) ?? nächsteSchicht.beginn
      ).diff(aktuelleSchicht.ende, 'hour') > 1
    ) {
      kombinierteSchichten[i + 1].beginn = kombinierteSchichten[i + 1].ende = aktuelleSchicht.ende.add(
        RUHE_ZEIT,
        'hour',
      );
      kombinierteSchichten[i + 1].pause = aktuelleSchicht.pause;
      continue;
    }

    const [change, nextDaten] = vorhandenCheck(daten, {
      beginB: aktuelleSchicht.ende.toISOString(),
      endeB: nächsteSchicht.beginn.toISOString(),
      pauseB: aktuelleSchicht.pause,
    });
    daten = nextDaten;
    if (!changed && change) changed = change;
  }

  DatenSortieren(daten, 'beginB');

  console.timeEnd('Generiere Bereitschaft');

  if (datenVorher == daten.length && !changed) {
    console.log('Keine änderung, Bereitschaft bereits vorhanden');

    return false;
  }

  return daten;
}

function vorhandenCheck(daten: IDatenBZ[], newDaten: IDatenBZ, depth: number = 1): [boolean, IDatenBZ[]] {
  const MAX_DEPTH = 5;
  if (depth > MAX_DEPTH) throw new Error('Fehler bei vorhandenCheck - Recurse Funktion');

  const updatedDaten: IDatenBZ[] = [...daten];
  const newBegin: Dayjs = dayjs(newDaten.beginB);
  const newEnd: Dayjs = dayjs(newDaten.endeB);

  const Tag1Neu: number = newBegin.date();
  const Tag2Neu: number = newEnd.date();

  const filteredDaten: IDatenBZ[] = daten.filter(value => {
    const TagBeginB: number = dayjs(value.beginB).date();
    const TagEndeB: number = dayjs(value.endeB).date();
    return TagBeginB === Tag1Neu || TagBeginB === Tag2Neu || TagEndeB === Tag1Neu || TagEndeB === Tag2Neu;
  });

  for (const row of filteredDaten) {
    const rowBegin = dayjs(row.beginB);
    const rowEnd = dayjs(row.endeB);

    // Prüfen, ob der neue Zeitraum bereits in einem anderen Zeitraum vorhanden ist
    if (newBegin.isBetween(rowBegin, rowEnd, null, '[]') && newEnd.isBetween(rowBegin, rowEnd, null, '[]')) {
      console.log('Bereitschaftszeitraum bereits in einem anderen Zeitraum vorhanden');
      return [false, daten];
    }

    // Prüfen, ob der neue Zeitraum einen vorhandenen Zeitraum vollständig überschneidet
    if (rowBegin.isBetween(newBegin, newEnd, null, '()') && rowEnd.isBetween(newBegin, newEnd, null, '()')) {
      console.log('Bereitschaftszeitraum überschneidet andern Zeitraum komplett');
      row.beginB = newBegin.toISOString();
      row.endeB = newEnd.toISOString();
      return [true, daten];
    }

    const endeBDate: Dayjs = rowEnd
      .set('hour', B_WECHSEL_STUNDE)
      .set('minute', B_WECHSEL_MINUTE)
      .set('second', 0)
      .set('millisecond', 0);
    if (newBegin.isBetween(rowBegin, rowEnd, null, '[)') && !rowEnd.isSame(endeBDate) && newEnd.isAfter(row.endeB)) {
      // Überlappung, wobei das neue Ende nach dem vorhandenen Ende und dem Bereitschaftszeitraumwechsel liegt
      if (newEnd.isAfter(endeBDate)) {
        row.endeB = endeBDate.toISOString();

        const neuerZeitraum: IDatenBZ = {
          beginB: endeBDate.toISOString(),
          endeB: newDaten.endeB,
          pauseB: 0,
        };
        console.log(
          'Überschneidung Bereitschaftszeitraum neues Ende nach vorhandenem und Bereitschaftszeitraumwechsel',
        );
        return vorhandenCheck(daten, neuerZeitraum, depth + 1);
      } else {
        row.endeB = newDaten.endeB;
        console.log('Überschneidung Bereitschaftszeitraum neues Ende nach vorhandenem');
        return [true, daten];
      }
    }

    const beginBDate: Dayjs = rowBegin
      .set('hour', B_WECHSEL_STUNDE)
      .set('minute', B_WECHSEL_MINUTE)
      .set('second', 0)
      .set('millisecond', 0);
    if (
      newEnd.isBetween(rowBegin, rowEnd, null, '(]') &&
      !rowBegin.isSame(beginBDate) &&
      newBegin.isBefore(row.beginB)
    ) {
      // Überlappung, wobei der neue Beginn vor dem vorhandenen Beginn und dem Bereitschaftszeitraumwechsel liegt
      if (newBegin.isBefore(beginBDate)) {
        row.beginB = beginBDate.toISOString();

        const neuerZeitraum: IDatenBZ = {
          beginB: newDaten.beginB,
          endeB: beginBDate.toISOString(),
          pauseB: 0,
        };
        console.log(
          'Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem und Bereitschaftszeitraumwechsel',
        );

        return vorhandenCheck(daten, neuerZeitraum, depth + 1);
      } else {
        row.beginB = newDaten.beginB;
        console.log('Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem');
        return [true, daten];
      }
    }
  }
  // Wenn keine Überlappung gefunden wurde, den neuen Zeitraum hinzufügen – ggf. an Monatsgrenze splitten
  const monthBoundary = newBegin.startOf('month').add(1, 'month');
  if (monthBoundary.isAfter(newBegin) && monthBoundary.isBefore(newEnd)) {
    updatedDaten.push({ beginB: newDaten.beginB, endeB: monthBoundary.toISOString(), pauseB: newDaten.pauseB });
    return vorhandenCheck(
      updatedDaten,
      { beginB: monthBoundary.toISOString(), endeB: newDaten.endeB, pauseB: 0 },
      depth + 1,
    );
  }
  updatedDaten.push(newDaten);
  return [true, updatedDaten];
}
