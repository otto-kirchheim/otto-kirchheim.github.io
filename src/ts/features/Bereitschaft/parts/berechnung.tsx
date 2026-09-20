import { LreType } from '@otto-kirchheim/nebengeld-shared';
import type { FeatureParts } from '@/core/hooks';
import type { IBerechnungMonatsErgebnis, IDatenBE, IDatenBZ, IVorgabenBerechnungMonat } from '@/types';
import { currency, formatCurrency, timeConvert } from '@/infrastructure/data/berechnungWerte';
import dayjs from '@/infrastructure/date/configDayjs';
import { getMonatFromBE, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import { DetailZeile, GruppenTitel } from '@/infrastructure/ui/berechnungBausteine';

type Bucket = IVorgabenBerechnungMonat['B'];

/**
 * Berechnungs-Slot der Bereitschaft: Bereitschaftsminuten (Zeitraum abzüglich Einsatzzeiten), LRE-Zähler und Privat-km je Monat;
 * Bereitschaftszulage, LRE- und Privat-PKW-Beträge (`sums`-Block 0 der Berechnung) sowie Tabellenzeilen und Monatskarte.
 */
const berechnung: FeatureParts['berechnung'] = {
  bucketKey: 'B',

  /**
   * Summiert die Werte eines Monats: Bereitschaftsminuten und LRE-Zähler.
   *
   * @param rows - BZ und BE (alle Monate).
   * @param monat - Monat (1-12).
   * @returns Bucket `B` des Monats.
   */
  aggregate(rows, monat): Bucket {
    const bucket: Bucket = { B: 0, L1: 0, L2: 0, L3: 0, K: 0 };

    (rows.BZ as IDatenBZ[] | undefined)
      ?.filter(value => getMonatFromBZ(value) === monat)
      .forEach(value => {
        bucket.B += dayjs(value.Ende).diff(dayjs(value.Beginn), 'minute') + value.Pause;
      });

    (rows.BE as IDatenBE[] | undefined)
      ?.filter(value => getMonatFromBE(value) === monat)
      .forEach(value => {
        const von = dayjs(`${value.Tag} ${value.Beginn}`, 'DD.MM.YYYY HH:mm');
        let bis = dayjs(`${value.Tag} ${value.Ende}`, 'DD.MM.YYYY HH:mm');
        if (bis.isBefore(von)) bis = bis.add(1, 'day');
        bucket.B -= bis.diff(von, 'minute');

        switch (value.LRE) {
          case LreType.LRE_1:
            bucket.L1++;
            break;
          case LreType.LRE_2:
            bucket.L2++;
            break;
          case LreType.LRE_3:
            bucket.L3++;
            break;
        }

        if (value.PrivatKm) bucket.K += value.PrivatKm;
      });

    return bucket;
  },

  /**
   * Formeln der Bereitschaft. Die Zwischensumme baut sich nacheinander auf (`+=`); die Reihenfolge darf nicht verändert werden.
   *
   * @param bucketRoh - Bucket `B` des Monats.
   * @param kontext - Tarifkraft/Beamter und Geldsätze des Monats.
   * @returns Beitrag mit Bereitschafts-Feldern und Zwischensumme.
   */
  calc(bucketRoh, { tarifKraft, geld }) {
    const item = bucketRoh as Bucket;
    const ergebnis: Partial<IBerechnungMonatsErgebnis> = {};
    const sums: number[] = [];

    if (item.B !== 0) {
      ergebnis.bereitschaftMinuten = item.B;
      ergebnis.bereitschaftAnzeige =
        tarifKraft === 'Tarifkraft' ? timeConvert(item.B) : Math.round((item.B - 600) / 8 / 60).toString();
      sums[0] =
        tarifKraft === 'Tarifkraft'
          ? Math.round(item.B / 60) * geld[tarifKraft]
          : Math.round((item.B - 600) / 8 / 60) * geld[tarifKraft];
      ergebnis.bereitschaftszulage = sums[0];
    }

    if (item.L1 !== 0) {
      const wert = Math.round(item.L1) * geld.LRE1;
      sums[0] += wert;
      ergebnis.lre1 = wert;
    }
    if (item.L2 !== 0) {
      const wert = Math.round(item.L2) * geld.LRE2;
      sums[0] += wert;
      ergebnis.lre2 = wert;
    }
    if (item.L3 !== 0) {
      const wert = Math.round(item.L3) * geld.LRE3;
      sums[0] += wert;
      ergebnis.lre3 = wert;
    }

    if (item.K !== 0) {
      const wert = Math.round(item.K) * (tarifKraft === 'Tarifkraft' ? geld.PrivatPKWTarif : geld.PrivatPKWBeamter);
      sums[0] += wert;
      ergebnis.privatPkw = wert;
    }

    if (sums.length !== 0) ergebnis.summeBereitschaft = sums[0];

    return { ergebnis, summe: sums.length !== 0 ? sums[0] : undefined, zaehltInGesamtsumme: true };
  },

  /**
   * Prüft, ob ein Monatsergebnis anzeigbare Werte der Bereitschaft enthält.
   *
   * @param ergebnis - Monatsergebnis.
   * @returns `true`, wenn mindestens ein Feld der Gruppe nicht `null` ist.
   */
  hatDaten: ergebnis =>
    ergebnis.bereitschaftMinuten !== null ||
    ergebnis.bereitschaftszulage !== null ||
    ergebnis.lre1 !== null ||
    ergebnis.lre2 !== null ||
    ergebnis.lre3 !== null ||
    ergebnis.privatPkw !== null ||
    ergebnis.summeBereitschaft !== null,

  tabelle: () => [
    {
      id: 'bereitschaftMinuten',
      label: 'Bereitschaftszeiten',
      rowSpan: 2,
      inhalt: m => (m.bereitschaftMinuten === null ? '' : m.bereitschaftMinuten.toString()),
    },
    { id: 'bereitschaftAnzeige', label: undefined, inhalt: m => m.bereitschaftAnzeige ?? '' },
    { id: 'bereitschaftszulage', label: 'Bereitschaftszulage', inhalt: m => currency(m.bereitschaftszulage) },
    { id: 'lre1', label: LreType.LRE_1, inhalt: m => currency(m.lre1) },
    { id: 'lre2', label: LreType.LRE_2, inhalt: m => currency(m.lre2) },
    { id: 'lre3', label: LreType.LRE_3, inhalt: m => currency(m.lre3) },
    { id: 'privatPkw', label: 'Privat-PKW', inhalt: m => currency(m.privatPkw) },
    { id: 'summeBereitschaft', label: 'Summe Bereitschaft', inhalt: m => currency(m.summeBereitschaft) },
  ],

  karte: ergebnis => (
    <>
      <GruppenTitel titel="Bereitschaft" summe={ergebnis.summeBereitschaft} />
      {ergebnis.bereitschaftMinuten !== null && (
        <DetailZeile
          label="Bereitschaftszeiten"
          wert={`${ergebnis.bereitschaftMinuten} / ${ergebnis.bereitschaftAnzeige ?? ''}`}
        />
      )}
      {ergebnis.bereitschaftszulage !== null && (
        <DetailZeile label="Bereitschaftszulage" wert={formatCurrency(ergebnis.bereitschaftszulage)} />
      )}
      {ergebnis.lre1 !== null && <DetailZeile label={LreType.LRE_1} wert={formatCurrency(ergebnis.lre1)} />}
      {ergebnis.lre2 !== null && <DetailZeile label={LreType.LRE_2} wert={formatCurrency(ergebnis.lre2)} />}
      {ergebnis.lre3 !== null && <DetailZeile label={LreType.LRE_3} wert={formatCurrency(ergebnis.lre3)} />}
      {ergebnis.privatPkw !== null && <DetailZeile label="Privat-PKW" wert={formatCurrency(ergebnis.privatPkw)} />}
    </>
  ),
};

export default berechnung;
