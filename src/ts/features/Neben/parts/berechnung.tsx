import { Fragment } from 'react';
import { ZULAGEN_CATALOG, type IZulageCatalogItem } from '@otto-kirchheim/nebengeld-shared';
import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenN, IVorgabenBerechnungMonat, IVorgabenGeldType } from '@/types';
import { getMonatFromN } from '@/shared/lib/date/getMonatFromItem';
import { currency } from '@/infrastructure/data/berechnungWerte';
import { DetailZeile, GruppenTitel, LabelTabelle } from '@/infrastructure/ui/berechnungBausteine';
import calculateZulagenBreakdown, {
  type IZulagenBreakdown,
  zulagenEinheitKurz,
} from '../utils/calculateZulagenBreakdown';

type Bucket = IVorgabenBerechnungMonat['N'];

const CATALOG_BY_CODE = new Map<string, IZulageCatalogItem>(ZULAGEN_CATALOG.map(item => [item.code, item]));

// Euro-Betrag je Bucket-Feld; Minuten-Buckets werden zu ganzen Stunden gerundet, F und C9 sind Stückzahlen.
const N_ZULAGEN_CALC: Array<(n: Bucket, g: IVorgabenGeldType) => number> = [
  (n, g) => n.F * g.Fahrentsch,
  (n, g) => Math.round(n.A / 60) * g.A,
  (n, g) => Math.round(n.B / 60) * g.B,
  (n, g) => Math.round(n.C / 60) * g.C,
  (n, g) => Math.round(n.CA / 60) * (g.C + g.A),
  (n, g) => Math.round(n.CB / 60) * (g.C + g.B),
  (n, g) => n.C9 * g.C * 9,
  (n, g) => Math.round(n.SIPO / 60) * g.SIPO,
];

/**
 * Berechnungs-Slot der Erschwerniszulagen (EZ/Neben): Minuten bzw. Stückzahlen je Zahlungshinweis, Euro-Summe
 * (`sums`-Block 2 der Berechnung), Tabellenzeilen inklusive Roh-Zulagen je Code und Monatskarte.
 */
const berechnung: FeatureParts['berechnung'] = {
  bucketKey: 'N',

  /**
   * Summiert die Zulagen eines Monats je Zahlungshinweis.
   *
   * @param rows - Nebengeld-Zeilen (alle Monate).
   * @param monat - Monat (1-12).
   * @returns Bucket `N` des Monats.
   */
  aggregate(rows, monat): Bucket {
    const bucket: Bucket = { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 };

    (rows.N as IDatenN[] | undefined)
      ?.filter(entry => getMonatFromN(entry) === monat)
      .forEach(entry => {
        for (const zulage of entry.Zulagen ?? []) {
          const item = CATALOG_BY_CODE.get(zulage.Typ);
          if (!item) continue;
          switch (item.paymentHint) {
            case 'Fahrentschaedigung':
              bucket.F += zulage.Wert;
              break;
            case 'A':
              bucket.A += zulage.Wert;
              break;
            case 'B':
              bucket.B += zulage.Wert;
              break;
            case 'C':
              bucket.C += zulage.Wert;
              break;
            case 'C+A':
              bucket.CA += zulage.Wert;
              break;
            case 'C+B':
              bucket.CB += zulage.Wert;
              break;
            case 'C*9':
              bucket.C9 += zulage.Wert;
              break;
            case 'SIPO':
              bucket.SIPO += zulage.Wert;
              break;
            // Ganzkoerperreinigung: noch nicht berechnet
          }
        }
      });

    return bucket;
  },

  /**
   * Euro-Summe der Zulagen eines Monats.
   *
   * @param bucketRoh - Bucket `N` des Monats.
   * @param kontext - Geldsätze des Monats.
   * @returns Beitrag mit `summeNebenbezuege` (nur bei Summe > 0); die Zwischensumme ist sonst 0.
   */
  calc(bucketRoh, { geld }) {
    const nTotal = N_ZULAGEN_CALC.reduce((sum, fn) => sum + fn(bucketRoh as Bucket, geld), 0);
    return {
      ergebnis: nTotal > 0 ? { summeNebenbezuege: nTotal } : {},
      summe: nTotal > 0 ? nTotal : 0,
      zaehltInGesamtsumme: true,
    };
  },

  hatDaten: ergebnis => ergebnis.summeNebenbezuege !== null,

  /**
   * Roh-Zulagen des Jahres je Code (Aufschlüsselung), unabhängig von der Euro-Berechnung.
   *
   * @returns Vorkommende Codes und Monatssummen.
   */
  vorbereite: () => calculateZulagenBreakdown(),

  /**
   * Roh-Zulagen zählen auch dann als Daten, wenn keine Euro-Summe berechnet wurde.
   *
   * @param extra - Aufschlüsselung aus `vorbereite`.
   * @param monat - Monat (1-12); ohne Angabe das ganze Jahr.
   * @returns `true`, wenn Roh-Zulagen vorhanden sind.
   */
  hatZusatzDaten(extra, monat) {
    const breakdown = extra as IZulagenBreakdown;
    return monat === undefined
      ? breakdown.codes.length > 0
      : breakdown.codes.some(c => breakdown.values[c.code][monat - 1] > 0);
  },

  tabelle(extra) {
    const breakdown = extra as IZulagenBreakdown;
    return [
      // Die Zulagen-Zeile erscheint nur bei vorhandenen Codes, vor "Summe Zulagen".
      ...(breakdown.codes.length > 0
        ? [
            {
              id: 'zulagenBreakdown',
              label: <LabelTabelle zeilen={breakdown.codes.map(c => [c.label, zulagenEinheitKurz(c.unit)])} />,
              inhalt: (m: { monat: number }) =>
                breakdown.codes.some(c => breakdown.values[c.code][m.monat - 1] > 0) ? (
                  <>
                    {breakdown.codes.map((c, i) => (
                      <Fragment key={c.code}>
                        {i > 0 && <br />}
                        {breakdown.values[c.code][m.monat - 1]}
                      </Fragment>
                    ))}
                  </>
                ) : (
                  ''
                ),
            },
          ]
        : []),
      { id: 'summeNebenbezuege', label: 'Summe Zulagen', inhalt: m => currency(m.summeNebenbezuege) },
    ];
  },

  karte(ergebnis, extra) {
    const breakdown = extra as IZulagenBreakdown;
    // Zulagen des Monats: nur Codes mit Wert > 0 im jeweiligen Monat
    const zulagenZeilen = breakdown.codes
      .filter(c => breakdown.values[c.code][ergebnis.monat - 1] > 0)
      .map(c => (
        <DetailZeile
          key={c.code}
          label={c.label}
          wert={`${breakdown.values[c.code][ergebnis.monat - 1]} ${zulagenEinheitKurz(c.unit)}`}
        />
      ));

    return (
      <>
        <GruppenTitel titel="Zulagen" summe={ergebnis.summeNebenbezuege} />
        {zulagenZeilen}
      </>
    );
  },
};

export default berechnung;
