import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenGeldType, IVorgabenU } from '@/types';

// Nebengeld-Buckets eines Monats: F und C9 als Stückzahl, alle übrigen in Minuten.
type NFields = { F: number; A: number; B: number; C: number; CA: number; CB: number; C9: number; SIPO: number };
// Euro-Betrag je NFields-Bucket; Minuten-Buckets werden zu ganzen Stunden gerundet.
const N_ZULAGEN_CALC: Array<(n: NFields, g: IVorgabenGeldType) => number> = [
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
 * Formatiert Minuten als "H:mm".
 *
 * @param num - Dauer in Minuten.
 * @returns Stunden ohne führende Null, Minuten zweistellig (z. B. 90 -> "1:30").
 */
export const timeConvert = (num: number): string => {
  const hours = Math.floor(num / 60);
  const minutes = Math.round(num % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Kehrfunktion zu `timeConvert`: parst eine "HH:mm"-Zeitspanne in Gesamtminuten.
 *
 * @param value - Zeitspanne im Format "HH:mm".
 * @returns Gesamtminuten; 0, wenn Stunden oder Minuten keine Zahl sind.
 */
export const parseDauerToMinutes = (value: string): number => {
  const [stunden, minuten] = value.split(':').map(Number);
  if (!Number.isFinite(stunden) || !Number.isFinite(minuten)) return 0;
  return stunden * 60 + minuten;
};

/**
 * Formatiert einen Betrag als Euro-Betrag im deutschen Format.
 *
 * @param value - Betrag in Euro.
 * @returns Formatierter String (z. B. "1.234,50 €").
 */
export const formatCurrency = (value: number): string =>
  value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

export type TarifKraft = IVorgabenU['Pers']['TB'];

export interface IBerechnungMonatsErgebnis {
  monat: number;
  /** null = keine Anzeige (leere Zelle) */
  bereitschaftMinuten: number | null;
  bereitschaftAnzeige: string | null;
  bereitschaftszulage: number | null;
  lre1: number | null;
  lre2: number | null;
  lre3: number | null;
  privatPkw: number | null;
  summeBereitschaft: number | null;
  abwesenheiten: { a8: number | null; a14: number | null; a24: number | null } | null;
  steuerfreieAbwesenheiten: { s8: number | null; s14: number | null } | null;
  summeEwt: number | null;
  summeNebenbezuege: number | null;
  /** Reine Stunden-Anzeige (Minuten), kein Geldwert — fließt bewusst nicht in summeGesamt ein. */
  eaMinuten: number | null;
  summeGesamt: number | null;
}

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
 * Reine Berechnungslogik der Berechnungstabelle: je Monat Bereitschaft (sums[0]), EWT (sums[1]) und
 * Nebenbezüge (sums[2]) sowie deren Gesamtsumme. Die Blöcke bauen die Zwischensummen nacheinander auf
 * (`+=`), ihre Reihenfolge darf nicht verändert werden. Nicht anzuzeigende Werte bleiben `null`.
 *
 * @param datenBerechnung - Monatsdaten (Bereitschaft B, EWT E, Nebengeld N, Entgeltausgleich EA).
 * @param datenGeldVorgabe - Geldsätze je Monat (werden über `createDatenGeldProxy` zusammengeführt).
 * @param tarifKraft - Tarifkraft oder Beamter; steuert Bereitschaftsformel, EWT-Sätze und Privat-PKW-Satz.
 * @returns Ein Ergebnis je Monat in der Reihenfolge von `datenBerechnung`.
 */
export default function calculateBerechnungRows(
  datenBerechnung: IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld,
  tarifKraft: TarifKraft,
): IBerechnungMonatsErgebnis[] {
  const datenGeld = createDatenGeldProxy(datenGeldVorgabe);

  return Object.entries(datenBerechnung).map(([Monat, item]) => {
    const monat = +Monat;
    const sums: number[] = [];

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

    if (item.B.B !== 0) {
      ergebnis.bereitschaftMinuten = item.B.B;
      ergebnis.bereitschaftAnzeige =
        tarifKraft === 'Tarifkraft' ? timeConvert(item.B.B) : Math.round((item.B.B - 600) / 8 / 60).toString();
      sums[0] =
        tarifKraft === 'Tarifkraft'
          ? Math.round(item.B.B / 60) * datenGeld[monat][tarifKraft]
          : Math.round((item.B.B - 600) / 8 / 60) * datenGeld[monat][tarifKraft];
      ergebnis.bereitschaftszulage = sums[0];
    }

    if (item.B.L1 !== 0) {
      const wert = Math.round(item.B.L1) * datenGeld[monat].LRE1;
      sums[0] += wert;
      ergebnis.lre1 = wert;
    }
    if (item.B.L2 !== 0) {
      const wert = Math.round(item.B.L2) * datenGeld[monat].LRE2;
      sums[0] += wert;
      ergebnis.lre2 = wert;
    }
    if (item.B.L3 !== 0) {
      const wert = Math.round(item.B.L3) * datenGeld[monat].LRE3;
      sums[0] += wert;
      ergebnis.lre3 = wert;
    }

    if (item.B.K !== 0) {
      const wert =
        Math.round(item.B.K) *
        (tarifKraft === 'Tarifkraft' ? datenGeld[monat].PrivatPKWTarif : datenGeld[monat].PrivatPKWBeamter);
      sums[0] += wert;
      ergebnis.privatPkw = wert;
    }

    if (sums.length !== 0) ergebnis.summeBereitschaft = sums[0];
    else if (!sums[0]) sums[0] = 0;

    if (tarifKraft === 'Tarifkraft') {
      if (item.E.A8 !== 0) sums[1] = item.E.A8 * datenGeld[monat].TE8;
      if (item.E.A14 !== 0) sums[1] += item.E.A14 * datenGeld[monat].TE14;
      if (item.E.A24 !== 0) sums[1] += item.E.A24 * datenGeld[monat].TE24;
    }
    if (item.E.A8 > 0 || item.E.A14 > 0 || item.E.A24 > 0)
      ergebnis.abwesenheiten = { a8: item.E.A8, a14: item.E.A14, a24: item.E.A24 };

    if (tarifKraft !== 'Tarifkraft') {
      if (item.E.S8 !== 0) sums[1] = item.E.S8 * datenGeld[monat].BE8;
      if (item.E.S14 !== 0) sums[1] += item.E.S14 * datenGeld[monat].BE14;
    }
    if (item.E.S8 > 0 || item.E.S14 > 0) ergebnis.steuerfreieAbwesenheiten = { s8: item.E.S8, s14: item.E.S14 };

    if (sums.length > 1) ergebnis.summeEwt = sums[1];
    else if (!sums[1]) sums[1] = 0;

    const nTotal = N_ZULAGEN_CALC.reduce((sum, fn) => sum + fn(item.N, datenGeld[monat]), 0);
    if (nTotal > 0) {
      sums[2] = nTotal;
      ergebnis.summeNebenbezuege = nTotal;
    } else {
      sums[2] = 0;
    }

    // Reine Stunden-Anzeige, bewusst außerhalb von sums[]. `item.EA` kann in einem älteren Storage-Snapshot
    // fehlen, der beim App-Start ohne Neuberechnung gerendert wird (Berechnung/index.ts).
    const eaMinuten = item.EA?.Minuten ?? 0;
    if (eaMinuten > 0) ergebnis.eaMinuten = eaMinuten;

    if (sums.length !== 0 && (sums[0] || sums[1] || sums[2]))
      ergebnis.summeGesamt = (sums[0] ?? 0) + (sums[1] ?? 0) + (sums[2] ?? 0);

    return ergebnis;
  });
}
