import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenGeldType, IVorgabenU } from '@/types';

type NFields = { F: number; A: number; B: number; C: number; CA: number; CB: number; C9: number; SIPO: number };
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

export const nullParser = (value: null | string | number): string | number => value ?? '&nbsp;';

export const timeConvert = (num: number): string => {
  const hours = Math.floor(num / 60);
  const minutes = Math.round(num % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

export const formatCurrency = (value: number): string =>
  value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

export type TarifKraft = IVorgabenU['pers']['TB'];

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
  summeGesamt: number | null;
}

/** Merge-Proxy: VorgabenGeld-Einträge späterer Monate überschreiben frühere feldweise. */
export function createDatenGeldProxy(datenGeldVorgabe: IVorgabenGeld): IVorgabenGeld {
  const datenGeldHandler: ProxyHandler<IVorgabenGeld> = {
    get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
      const maxMonat: number = Number(prop);
      let returnObjekt = target[1];
      const keys = Object.keys(target).map(Number);
      if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
        for (let monat = 2; monat <= maxMonat; monat++)
          if (typeof target[monat] !== 'undefined') returnObjekt = { ...returnObjekt, ...target[monat] };
      return returnObjekt;
    },
    set: (_target: IVorgabenGeld, prop: string, newValue) => {
      console.log('veränderung von datenGeld nicht erlaubt:', prop, newValue);
      return false;
    },
  };

  return new Proxy(datenGeldVorgabe, datenGeldHandler);
}

/**
 * Reine Berechnungslogik der Berechnungstabelle, extrahiert aus generateTableBerechnung.
 * Die sequenzielle Zwischensummen-Semantik (sums[0..2]) entspricht exakt dem früheren
 * zeilenweisen switch-Block; die Reihenfolge der Blöcke darf nicht verändert werden.
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

    if (sums.length !== 0 && (sums[0] || sums[1] || sums[2]))
      ergebnis.summeGesamt = (sums[0] ?? 0) + (sums[1] ?? 0) + (sums[2] ?? 0);

    return ergebnis;
  });
}
