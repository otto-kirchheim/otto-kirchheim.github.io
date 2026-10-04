import { DBStack } from '@db-ux/react-core-components';
import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenEA, IVorgabenBerechnungMonat } from '@/types';
import { parseDauerToMinutes, timeConvert } from '@/shared/lib/ressource/berechnungWerte';
import { getMonatFromEA } from '../model/monat';

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
      <DBStack direction="row" justifyContent="space-between" gap="x-small" className="berechnung-card-gruppe">
        <strong>Entgeltausgleich</strong>
        <strong className="nowrap">{timeConvert(ergebnis.eaMinuten)}</strong>
      </DBStack>
    ),
};

export default berechnung;
