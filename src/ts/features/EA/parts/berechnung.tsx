import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenEA, IVorgabenBerechnungMonat } from '@/types';
import { parseDauerToMinutes, timeConvert } from '@/infrastructure/data/berechnungWerte';
import { getMonatFromEA } from '@/shared/lib/date/getMonatFromItem';

type Bucket = IVorgabenBerechnungMonat['EA'];

/**
 * Berechnungs-Slot des Entgeltausgleichs: Minuten je Monat als reine Stunden-Anzeige (kein Geldwert, keine Gesamtsumme)
 * sowie Tabellenzeile und Monatskarte.
 */
const berechnung: FeatureParts['berechnung'] = {
  bucketKey: 'EA',

  /**
   * Summiert die EA-Minuten eines Monats.
   *
   * @param rows - EA-Zeilen (alle Monate).
   * @param monat - Monat (1-12).
   * @returns Bucket `EA` des Monats.
   */
  aggregate(rows, monat): Bucket {
    const bucket: Bucket = { Minuten: 0 };

    (rows.EA as IDatenEA[] | undefined)
      ?.filter(entry => getMonatFromEA(entry) === monat)
      .forEach(entry => {
        bucket.Minuten += parseDauerToMinutes(entry.Dauer);
      });

    return bucket;
  },

  /**
   * Übernimmt die Minuten als Anzeige. `bucketRoh` kann in einem älteren Storage-Snapshot fehlen, der beim App-Start
   * ohne Neuberechnung gerendert wird.
   *
   * @param bucketRoh - Bucket `EA` des Monats oder `undefined`.
   * @returns Beitrag ohne Zwischensumme, der nicht in die Gesamtsumme einfließt.
   */
  calc(bucketRoh) {
    const eaMinuten = (bucketRoh as Bucket | undefined)?.Minuten ?? 0;
    return { ergebnis: eaMinuten > 0 ? { eaMinuten } : {}, zaehltInGesamtsumme: false };
  },

  hatDaten: ergebnis => ergebnis.eaMinuten !== null,

  tabelle: () => [
    {
      id: 'entgeltausgleich',
      label: 'Entgeltausgleich',
      inhalt: m => (m.eaMinuten === null ? '' : timeConvert(m.eaMinuten)),
    },
  ],

  karte: ergebnis =>
    ergebnis.eaMinuten === null ? null : (
      <div className="d-flex justify-content-between gap-2 fw-bold pt-2 pb-1 berechnung-card-gruppe">
        <span className="text-start">Entgeltausgleich</span>
        <span className="text-end text-nowrap">{timeConvert(ergebnis.eaMinuten)}</span>
      </div>
    ),
};

export default berechnung;
