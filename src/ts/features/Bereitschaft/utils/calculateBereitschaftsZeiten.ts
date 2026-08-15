import type { Dayjs } from 'dayjs';
import type {
  IDatenBZ,
  IMonatsDaten,
  IPerWeekdaySchicht,
  ISchichtZeiten,
  IVorgabenU,
  IVorgabenUvorgabenB,
} from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as DatenSortieren } from '@/infrastructure/data/DatenSortieren';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { resolveHolidayRegion } from '@/infrastructure/date/holidayRegion';
import { B_WECHSEL_STUNDE, B_WECHSEL_MINUTE } from './constants';

type Schicht = {
  beginn: Dayjs;
  ende: Dayjs;
  pause: number;
};

function setTimeFromHHMM(baseDate: Dayjs, time: string): Dayjs {
  const [hours, minutes] = time.split(':').map(Number);
  return baseDate.set('hour', hours).set('minute', minutes).set('second', 0).set('millisecond', 0);
}

function mergePerWeekdaySchicht(base: IPerWeekdaySchicht, override?: Partial<IPerWeekdaySchicht>): IPerWeekdaySchicht {
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
  sonder: boolean,
  sonderRangeOrDaten: { von: Dayjs; bis: Dayjs } | IMonatsDaten['BZ'] | undefined,
  datenOrSchichtenOverrides?: IMonatsDaten['BZ'] | IVorgabenUvorgabenB['schichtenOverrides'],
  schichtenOverrides?: IVorgabenUvorgabenB['schichtenOverrides'],
  sonderOverride?: ISchichtZeiten,
): IMonatsDaten['BZ'] | false {
  const sonderRange = Array.isArray(sonderRangeOrDaten) ? undefined : sonderRangeOrDaten;
  let daten: IMonatsDaten['BZ'] = Array.isArray(sonderRangeOrDaten)
    ? sonderRangeOrDaten
    : ((datenOrSchichtenOverrides as IMonatsDaten['BZ'] | undefined) ?? []);
  const effectiveSchichtenOverrides: IVorgabenUvorgabenB['schichtenOverrides'] | undefined = Array.isArray(
    sonderRangeOrDaten,
  )
    ? (datenOrSchichtenOverrides as IVorgabenUvorgabenB['schichtenOverrides'] | undefined)
    : schichtenOverrides;
  console.time('Generiere Bereitschaft');

  console.groupCollapsed('Vorgaben');
  console.log('nacht: ' + nacht);
  console.log('spaet: ' + spaet);
  console.log('sonder: ' + sonder);
  console.log(
    'sonderRange: ' + (sonderRange ? `${sonderRange.von.toISOString()} - ${sonderRange.bis.toISOString()}` : 'none'),
  );
  console.log('Bereitschafts Anfang: ' + bereitschaftsAnfang.toDate());
  console.log('Bereitschafts Ende: ' + bereitschaftsEnde.toDate());
  console.log('Nacht Anfang: ' + nachtAnfang.toDate());
  console.log('Nacht Ende: ' + nachtEnde.toDate());
  console.groupEnd();

  let changed: boolean = false;

  // Voreinstellungen Übernehmen
  const datenU: IVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  if (!datenU) throw new Error('VorgabenU nicht gefunden');
  const effectiveSonder = sonderOverride ?? datenU.Arbeitszeit.sonder;

  const holidayRegion = resolveHolidayRegion({ bundesland: datenU.Pers.Bundesland });

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

  const getNachtSchichten = (
    anfang: Dayjs,
    ende: Dayjs,
    nachtSchicht: IPerWeekdaySchicht | null,
    fallbackPause: number,
  ): Schicht[] => {
    const schichten: Schicht[] = [];

    let tagAnfang: Dayjs = anfang.startOf('day');

    while (tagAnfang.isBefore(ende, 'day')) {
      // Nacht je Wochentag aus aZ.nacht + Override auflösen; an arbeitsfreien Tagen Fensterzeiten als Fallback.
      const config = nachtSchicht ? resolveSchichtDay(nachtSchicht, tagAnfang.isoWeekday()) : null;
      const beginnHHMM = config ? config.beginn : anfang.format('HH:mm');
      const endeHHMM = config ? config.ende : ende.format('HH:mm');
      const pause = config ? config.pause : fallbackPause;

      const beginn = setTimeFromHHMM(tagAnfang, beginnHHMM);
      const endeBase = setTimeFromHHMM(tagAnfang, endeHHMM);
      const endeZeit = endeBase.isSameOrBefore(beginn) ? endeBase.add(1, 'day') : endeBase;

      schichten.push({
        beginn,
        ende: endeZeit,
        pause,
      });
      tagAnfang = tagAnfang.add(1, 'day').startOf('day');
    }

    return schichten;
  };

  const getTagSchichten = (
    anfang: Dayjs,
    ende: Dayjs,
    includeSpaet: boolean,
    includeSonder: boolean,
    sonderBereich?: { von: Dayjs; bis: Dayjs },
  ): Schicht[] => {
    const maxEnde: Dayjs = anfang.add(1, 'month').startOf('month');

    let tagAnfang: Dayjs = anfang.startOf('day');
    const schichten: Schicht[] = [];

    while (tagAnfang.isSameOrBefore(ende, 'day') && tagAnfang.isBefore(maxEnde)) {
      const sonderTag =
        includeSonder &&
        effectiveSonder.aktiv &&
        sonderBereich !== undefined &&
        tagAnfang.isSameOrAfter(sonderBereich.von, 'day') &&
        tagAnfang.isSameOrBefore(sonderBereich.bis, 'day');

      const fruehSchicht = mergePerWeekdaySchicht(datenU.Arbeitszeit.frueh, effectiveSchichtenOverrides?.frueh);
      const fruehConfig = sonderTag ? null : resolveSchichtDay(fruehSchicht, tagAnfang.isoWeekday());
      const spaetConfig =
        !sonderTag && includeSpaet && datenU.Arbeitszeit.spaet.aktiv
          ? resolveSchichtDay(
              mergePerWeekdaySchicht(datenU.Arbeitszeit.spaet, effectiveSchichtenOverrides?.spaet),
              tagAnfang.isoWeekday(),
            )
          : null;
      const sonderConfig = sonderTag ? effectiveSonder : null;

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

      if (sonderConfig) {
        const sonderBeginn = setTimeFromHHMM(tagAnfang, sonderConfig.beginn);
        const sonderEndeBase = setTimeFromHHMM(tagAnfang, sonderConfig.ende);
        const sonderEnde = sonderEndeBase.isBefore(sonderBeginn) ? sonderEndeBase.add(1, 'day') : sonderEndeBase;
        tagSchichten.push({
          beginn: sonderBeginn,
          ende: sonderEnde,
          pause: sonderConfig.pause,
        });
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

  // Nur wenn ein Nacht-Override vorliegt, je Wochentag aus aZ.nacht + Override auflösen.
  // Ohne Override bleiben die (aus aZ abgeleiteten) Fensterzeiten maßgeblich – kein Verhaltenswechsel.
  const nachtOverride = effectiveSchichtenOverrides?.nacht;
  const hasNachtOverride =
    !!nachtOverride &&
    (!!nachtOverride.default ||
      !!nachtOverride.regelarbeitstage ||
      Object.keys(nachtOverride.overrides ?? {}).length > 0);
  const nachtSchichtMerged: IPerWeekdaySchicht | null =
    hasNachtOverride && datenU.Arbeitszeit.nacht.aktiv
      ? mergePerWeekdaySchicht(datenU.Arbeitszeit.nacht, nachtOverride)
      : null;
  const fallbackNachtPause = datenU.Arbeitszeit.nacht.aktiv
    ? datenU.Arbeitszeit.nacht.default.pause
    : NACHT_PAUSEN_VORGABE;
  const nachtSchichten: Schicht[] = nacht
    ? getNachtSchichten(nachtAnfang, nachtEnde, nachtSchichtMerged, fallbackNachtPause)
    : [];
  const tagSchichten: Schicht[] = getTagSchichten(bereitschaftsAnfang, bereitschaftsEnde, spaet, sonder, sonderRange);

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
      Beginn: aktuelleSchicht.ende.toISOString(),
      Ende: nächsteSchicht.beginn.toISOString(),
      Pause: aktuelleSchicht.pause,
    });
    daten = nextDaten;
    if (!changed && change) changed = change;
  }

  DatenSortieren(daten, 'Beginn');

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
  const newBegin: Dayjs = dayjs(newDaten.Beginn);
  const newEnd: Dayjs = dayjs(newDaten.Ende);

  const Tag1Neu: number = newBegin.date();
  const Tag2Neu: number = newEnd.date();

  const filteredDaten: IDatenBZ[] = daten.filter(value => {
    const TagBeginB: number = dayjs(value.Beginn).date();
    const TagEndeB: number = dayjs(value.Ende).date();
    return TagBeginB === Tag1Neu || TagBeginB === Tag2Neu || TagEndeB === Tag1Neu || TagEndeB === Tag2Neu;
  });

  for (const row of filteredDaten) {
    const rowBegin = dayjs(row.Beginn);
    const rowEnd = dayjs(row.Ende);

    // Prüfen, ob der neue Zeitraum bereits in einem anderen Zeitraum vorhanden ist
    if (newBegin.isBetween(rowBegin, rowEnd, null, '[]') && newEnd.isBetween(rowBegin, rowEnd, null, '[]')) {
      console.log('Bereitschaftszeitraum bereits in einem anderen Zeitraum vorhanden');
      return [false, daten];
    }

    // Prüfen, ob der neue Zeitraum einen vorhandenen Zeitraum vollständig überschneidet
    if (rowBegin.isBetween(newBegin, newEnd, null, '()') && rowEnd.isBetween(newBegin, newEnd, null, '()')) {
      console.log('Bereitschaftszeitraum überschneidet andern Zeitraum komplett');
      row.Beginn = newBegin.toISOString();
      row.Ende = newEnd.toISOString();
      return [true, daten];
    }

    const endeBDate: Dayjs = rowEnd
      .set('hour', B_WECHSEL_STUNDE)
      .set('minute', B_WECHSEL_MINUTE)
      .set('second', 0)
      .set('millisecond', 0);
    if (newBegin.isBetween(rowBegin, rowEnd, null, '[)') && !rowEnd.isSame(endeBDate) && newEnd.isAfter(row.Ende)) {
      // Überlappung, wobei das neue Ende nach dem vorhandenen Ende und dem Bereitschaftszeitraumwechsel liegt
      if (newEnd.isAfter(endeBDate)) {
        row.Ende = endeBDate.toISOString();

        const neuerZeitraum: IDatenBZ = {
          Beginn: endeBDate.toISOString(),
          Ende: newDaten.Ende,
          Pause: 0,
        };
        console.log(
          'Überschneidung Bereitschaftszeitraum neues Ende nach vorhandenem und Bereitschaftszeitraumwechsel',
        );
        return vorhandenCheck(daten, neuerZeitraum, depth + 1);
      } else {
        row.Ende = newDaten.Ende;
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
      newBegin.isBefore(row.Beginn)
    ) {
      // Überlappung, wobei der neue Beginn vor dem vorhandenen Beginn und dem Bereitschaftszeitraumwechsel liegt
      if (newBegin.isBefore(beginBDate)) {
        row.Beginn = beginBDate.toISOString();

        const neuerZeitraum: IDatenBZ = {
          Beginn: newDaten.Beginn,
          Ende: beginBDate.toISOString(),
          Pause: 0,
        };
        console.log(
          'Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem und Bereitschaftszeitraumwechsel',
        );

        return vorhandenCheck(daten, neuerZeitraum, depth + 1);
      } else {
        row.Beginn = newDaten.Beginn;
        console.log('Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem');
        return [true, daten];
      }
    }
  }
  // Wenn keine Überlappung gefunden wurde, den neuen Zeitraum hinzufügen – ggf. an Monatsgrenze splitten
  const monthBoundary = newBegin.startOf('month').add(1, 'month');
  if (monthBoundary.isAfter(newBegin) && monthBoundary.isBefore(newEnd)) {
    updatedDaten.push({ Beginn: newDaten.Beginn, Ende: monthBoundary.toISOString(), Pause: newDaten.Pause });
    return vorhandenCheck(
      updatedDaten,
      { Beginn: monthBoundary.toISOString(), Ende: newDaten.Ende, Pause: 0 },
      depth + 1,
    );
  }
  updatedDaten.push(newDaten);
  return [true, updatedDaten];
}
