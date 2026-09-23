import type {
  IBerechnungMonatsErgebnis,
  IVorgabenBerechnung,
  IVorgabenGeld,
  IVorgabenGeldType,
  TarifKraft,
} from '@/types';
import type { IBerechnungTeil } from './ladeBerechnungsTeile';

// Formatter und Typen liegen fuer die Feature-Slots ausserhalb dieser Datei (`shared/lib/ressource/berechnungWerte`, `core/types/IBerechnung`).

/**
 * Merge-Proxy: VorgabenGeld-Einträge späterer Monate überschreiben frühere feldweise. Zugriff auf Monat n
 * liefert die Werte von Monat 1, überlagert mit allen vorhandenen Einträgen bis einschließlich n. Schreiben
 * ist nicht erlaubt (wird geloggt und abgelehnt).
 *
 * @param datenGeldVorgabe - VorgabenGeld, Schlüssel = Monat ab dem der Eintrag gilt (1 ist Pflicht).
 * @returns Proxy, der pro Monat (1-12) die zusammengeführten Geldwerte liefert.
 */
export function createDatenGeldProxy(datenGeldVorgabe: IVorgabenGeld): IVorgabenGeld {
  const datenGeldHandler: ProxyHandler<IVorgabenGeld> = {
    /**
     * Liefert die zusammengeführten Geldwerte für den Monat `prop`.
     *
     * @param target - Ursprüngliche VorgabenGeld.
     * @param prop - Monat als Property-Schlüssel (String).
     * @returns Geldwerte, wie sie im Monat `prop` gelten.
     */
    get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
      const maxMonat: number = Number(prop);
      let returnObjekt = target[1];
      const keys = Object.keys(target).map(Number);
      if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
        for (let monat = 2; monat <= maxMonat; monat++)
          if (typeof target[monat] !== 'undefined') returnObjekt = { ...returnObjekt, ...target[monat] };
      return returnObjekt;
    },
    /**
     * Lehnt jede Schreiboperation ab.
     *
     * @param _target - Ursprüngliche VorgabenGeld (ungenutzt).
     * @param prop - Angefragter Schlüssel.
     * @param newValue - Abgelehnter Wert.
     * @returns Immer `false` (Schreiben nicht erlaubt).
     */
    set: (_target: IVorgabenGeld, prop: string, newValue) => {
      console.log('veränderung von datenGeld nicht erlaubt:', prop, newValue);
      return false;
    },
  };

  return new Proxy(datenGeldVorgabe, datenGeldHandler);
}

/**
 * Reine Berechnungslogik der Berechnungstabelle: je Monat die Beitraege der Features (Bereitschaft, EWT, Erschwerniszulagen,
 * Entgeltausgleich; Formeln im Slot `berechnung` jedes Features) sowie deren Gesamtsumme. Die Beitraege bauen die Zwischensummen
 * nacheinander auf, ihre Reihenfolge folgt `meta.order` der Features und darf nicht verändert werden. Nicht anzuzeigende Werte bleiben `null`.
 *
 * @param datenBerechnung - Monatsdaten (Buckets je Feature: Bereitschaft B, EWT E, Nebengeld N, Entgeltausgleich EA).
 * @param datenGeldVorgabe - Geldsätze je Monat (werden über `createDatenGeldProxy` zusammengeführt).
 * @param tarifKraft - Tarifkraft oder Beamter; steuert Bereitschaftsformel, EWT-Sätze und Privat-PKW-Satz.
 * @param teile - Berechnungs-Slots der Features in `meta.order` (`ladeBerechnungsTeile`).
 * @returns Ein Ergebnis je Monat in der Reihenfolge von `datenBerechnung`.
 */
export default function calculateBerechnungRows(
  datenBerechnung: IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld,
  tarifKraft: TarifKraft,
  teile: readonly IBerechnungTeil[],
): IBerechnungMonatsErgebnis[] {
  const datenGeld = createDatenGeldProxy(datenGeldVorgabe);

  return Object.entries(datenBerechnung).map(([Monat, item]) => {
    const monat = +Monat;
    const geld = datenGeld[monat];

    const ergebnis: IBerechnungMonatsErgebnis = {
      monat,
      bereitschaftMinuten: null,
      bereitschaftAnzeige: null,
      bereitschaftszulage: null,
      lre1: null,
      lre2: null,
      lre3: null,
      privatPkw: null,
      summeBereitschaft: null,
      abwesenheiten: null,
      steuerfreieAbwesenheiten: null,
      summeEwt: null,
      summeNebenbezuege: null,
      eaMinuten: null,
      summeGesamt: null,
    };

    // Zwischensummen der Features, die in die Gesamtsumme einfliessen (Reihenfolge = meta.order).
    const summen: number[] = [];
    for (const { part } of teile) {
      // `item[bucketKey]` fehlt in einem aelteren oder unvollstaendigen Storage-Snapshot (z. B. `EA`, oder ein Feature, das beim
      // Speichern nicht geladen war): dann gilt der leere Bucket des Features.
      const bucket = (item as unknown as Record<string, unknown>)[part.bucketKey] ?? part.aggregate({}, monat);
      const beitrag = part.calc(bucket, { tarifKraft, geld, monat });
      Object.assign(ergebnis, beitrag.ergebnis);
      if (beitrag.zaehltInGesamtsumme) summen.push(beitrag.summe ?? 0);
    }

    if (summen.some(Boolean)) ergebnis.summeGesamt = summen.reduce((gesamt, summe) => gesamt + summe, 0);

    return ergebnis;
  });
}
