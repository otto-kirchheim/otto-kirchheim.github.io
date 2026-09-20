import type {
  IBereitschaftseinsatz,
  IBereitschaftszeitraum,
  IVorgabeValue,
  TarifBesoldung,
} from '@otto-kirchheim/nebengeld-shared';
import type { FeaturePdfContext } from '@/core/hooks';
import { filterByMonat, getMonatFromBE, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import tableToArray from '@/infrastructure/data/tableToArray';
import { tableIdOf } from '@/infrastructure/data/resourceConfig';
import { alsMinuten, alsZeitstempelMinuten, ZEILEN_OPS } from '@/infrastructure/pdf/aggregatoren';
import type { IPdfBase } from '@/infrastructure/pdf/pdfDaten';
import type { IDatenBE, IDatenBZ } from '@/types';

// `Dauer` wird erst durch `bzAbgeleiteteWerte()` (`features/Bereitschaft/utils/pdfDaten.ts`) berechnet, deshalb optional
// statt vom Typsystem erzwungen. Bewusst `number` (Minuten), nicht `"HH:mm"` wie bei EWT.
// `Pause` bleibt optional (statt über `Required` erzwungen): `generatePDF` setzt eine 0-Pause bewusst
// auf `undefined`, damit die Spalte leer bleibt statt „0" zu drucken; `bzAbgeleiteteWerte()` rechnet
// mit `?? 0` weiter.
export type IPdfBereitschaftszeitraum = Required<Omit<IBereitschaftszeitraum, '_id' | 'Pause'>> & {
  Pause?: number | undefined;
  Dauer?: number;
};

// `PrivatKmBetrag` (Euro, Tarifkraft-/Beamter-Satz aus VorgabenGeld) ist wie `Dauer` optional.
// `PrivatKm` fehlt hier bewusst im `Required`: gedruckt wird je Person nur eine der beiden Spalten
// (Tarifkraft: rohe km / Beamter: Euro-Betrag), siehe `beAbgeleiteteWerte()`.
export type IPdfBereitschaftseinsatz = Required<
  Omit<IBereitschaftseinsatz, '_id' | 'Bereitschaftszeitraum' | 'Pause' | 'PrivatKm'>
> & {
  Pause?: number | undefined;
  Dauer?: number;
  PrivatKmBetrag?: number;
};

export interface IBereitschaftszeitraumPdfBody extends IPdfBase {
  Daten: {
    BZ: IPdfBereitschaftszeitraum[];
    BE?: IPdfBereitschaftseinsatz[];
  };
  Bereitschaftszulage?: Partial<BereitschaftszulageWerte>;
}

export interface BzAbgeleiteteWerte {
  /** Minuten, nicht HH:mm. */
  Dauer: number;
}

/**
 * Dauer eines Bereitschaftszeitraums in Minuten (bewusst Zahl statt `FORMAT.stunden`-Text). `Beginn`/`Ende`
 * sind volle Zeitstempel und dürfen über Tage laufen, daher `zeitspanne` statt `zeitdifferenz`. `Pause`
 * wird ADDIERT (Bereitschaft zählt inkl. Pause, wie `aktualisiereBerechnung.ts`).
 *
 * @param zeile - Bereitschaftszeitraum mit `Beginn`, `Ende` und optionaler `Pause` (Minuten).
 * @returns Dauer in Minuten inklusive Pause.
 */
export function bzAbgeleiteteWerte(
  zeile: Pick<IPdfBereitschaftszeitraum, 'Beginn' | 'Ende' | 'Pause'>,
): BzAbgeleiteteWerte {
  const minuten =
    ZEILEN_OPS.zeitspanne([alsZeitstempelMinuten(zeile.Ende), alsZeitstempelMinuten(zeile.Beginn)]) +
    (zeile.Pause ?? 0);
  return { Dauer: minuten };
}

export interface BeAbgeleiteteWerte {
  /** Minuten, nicht HH:mm. */
  Dauer: number;
  /** Euro (km * Satz), auf 2 Nachkommastellen gerundet; `undefined` bei 0 km. */
  PrivatKmBetrag?: number;
}

/**
 * Dauer und Privat-km-Wert eines Bereitschaftseinsatzes. `Beginn`/`Ende` sind reine `"HH:mm"`-Zeiten,
 * daher `zeitdifferenz` (Mitternacht-Wrap).
 *
 * `privatKmSatz` (Euro/km, Tarifkraft vs. Beamter) kommt vorberechnet vom Aufrufer. Das Runden auf
 * 2 Nachkommastellen verhindert Fließkomma-Rauschen (`12 * 0.27`) in aufaddierten Summen.
 *
 * Gedruckt wird je Person nur eine der Spalten (Tarifkraft: rohe km, Beamter: Euro-Betrag) -- die
 * Vorlage wählt.
 *
 * @param zeile - Bereitschaftseinsatz mit `Beginn`, `Ende` und rohen `PrivatKm`.
 * @param privatKmSatz - Euro je km (vom Aufrufer nach Tarifkraft/Beamter gewählt).
 * @returns Dauer in Minuten und Privat-km-Betrag (`undefined` bei 0 km).
 */
export function beAbgeleiteteWerte(
  zeile: Pick<IPdfBereitschaftseinsatz, 'Beginn' | 'Ende'> & { PrivatKm: number },
  privatKmSatz: number,
): BeAbgeleiteteWerte {
  const privatKmBetrag = Math.round(zeile.PrivatKm * privatKmSatz * 100) / 100;
  return {
    Dauer: ZEILEN_OPS.zeitdifferenz([alsMinuten(zeile.Ende), alsMinuten(zeile.Beginn)]),
    PrivatKmBetrag: privatKmBetrag || undefined,
  };
}

export interface BereitschaftszulageWerte {
  /**
   * Tarifkraft/Beamter als Druckfeld (`TB_VALUES` kennt drei Werte, das PDF nur diese Unterscheidung).
   * Immer gesetzt, auch bei 0 Minuten.
   */
  TarifBeamter: 'Tarifkraft' | 'Beamter';
  BereitschaftsMinuten?: number;
  SummeTarif?: number;
  SummeBeamter1?: number;
  SummeBeamter2?: number;
  SummeBeamter3?: number;
  GeldwertBeamter?: number;
}

/**
 * Bereitschaftszulage-Zwischenwerte -- Arithmetik aus `calculateBerechnungRows.ts`, in benannte
 * Schritte für den Druck zerlegt. `bereitschaftMinuten` ("Differenz BZ-BE") kommt live vom Aufrufer;
 * kein Storage-Zugriff hier (veraltete Werte, oder ein `data:changed` mit vollem AutoSave-Zyklus).
 *
 * `0` Minuten -> nur `TarifBeamter` (wie `IBerechnungMonatsErgebnis`). Je nach TB wird nur EIN
 * Geld-Zweig befüllt, der andere bleibt `undefined`. `SummeTarif` ist eine reine Stundenzahl; nur
 * `SummeBeamter3` ist ein Geldwert.
 *
 * @param bereitschaftMinuten - Differenz BZ-BE in Minuten.
 * @param tarifKraft - Tarifkraft oder Besoldungsgruppe.
 * @param geldMonat - Sätze der Besoldungsgruppen A 8 und A 9.
 * @returns Zwischenwerte; nur `TarifBeamter` bei 0 Minuten.
 */
export function bereitschaftszulageAbgeleiteteWerte(
  bereitschaftMinuten: number,
  tarifKraft: TarifBesoldung,
  geldMonat: Pick<IVorgabeValue, 'Besoldungsgruppe A 8' | 'Besoldungsgruppe A 9'>,
): BereitschaftszulageWerte {
  const tarifBeamter = tarifKraft === 'Tarifkraft' ? 'Tarifkraft' : 'Beamter';
  if (bereitschaftMinuten === 0) return { TarifBeamter: tarifBeamter };
  if (tarifKraft === 'Tarifkraft') {
    return {
      TarifBeamter: tarifBeamter,
      BereitschaftsMinuten: bereitschaftMinuten,
      SummeTarif: Math.round(bereitschaftMinuten / 60),
    };
  }
  const summeBeamter1 = bereitschaftMinuten - 600;
  const summeBeamter2 = Math.round(summeBeamter1 / 8 / 60);
  const geldwertBeamter = geldMonat[tarifKraft] ?? 0;
  return {
    TarifBeamter: tarifBeamter,
    BereitschaftsMinuten: bereitschaftMinuten,
    SummeBeamter1: summeBeamter1,
    SummeBeamter2: summeBeamter2,
    // Gerundet gegen Fließkomma-Rauschen (`11 * 16.37 === 180.07000000000002`).
    SummeBeamter3: Math.round(summeBeamter2 * geldwertBeamter * 100) / 100,
    GeldwertBeamter: geldwertBeamter,
  };
}

/**
 * Baut die PDF-Daten der Bereitschaft (BZ und BE des Exportmonats) inklusive vorberechneter Dauern, Privat-km-Betrag und Bereitschaftszulage.
 *
 * @param context - Exportmonat, persoenliche Vorgaben und Geld-Vorgaben des Monats (`FeaturePdfContext`).
 * @returns `Daten` (BZ, BE) und Top-Level `Bereitschaftszulage`.
 */
export function baueBereitschaftPdfDaten({ monat, vorgabenU, vorgabenGeld }: FeaturePdfContext): {
  Daten: IBereitschaftszeitraumPdfBody['Daten'];
  Bereitschaftszulage: BereitschaftszulageWerte;
} {
  const bzRaw = filterByMonat(tableToArray<IDatenBZ<string>>(tableIdOf('BZ')), monat, getMonatFromBZ);
  const beRaw = filterByMonat(tableToArray<IDatenBE>(tableIdOf('BE')), monat, getMonatFromBE);
  // Beamter = TB !== 'Tarifkraft' (Konvention wie in calculateBerechnungRows.ts); bestimmt den
  // Privat-km-Satz (`PrivatPKWBeamter`/`PrivatPKWTarif`) fuer beAbgeleiteteWerte().
  const beamter = vorgabenU.Pers.TB !== 'Tarifkraft';
  const privatKmSatz = beamter ? vorgabenGeld.PrivatPKWBeamter : vorgabenGeld.PrivatPKWTarif;
  // Vorberechnete `Dauer`/`PrivatKmBetrag` stehen mit im Zeilenobjekt, `build()` liest sie als
  // normale Datenpfade (Daten.BZ[].Dauer, Daten.BE[].Dauer/PrivatKmBetrag). Eigene Variablen,
  // weil dieselben Zeilen unten fuer die Bereitschaftszulage summiert werden.
  const bzMitDauer = bzRaw.map(bz => {
    // 0-Pause bewusst als `undefined` -- die Spalte bleibt leer statt „0" zu drucken;
    // `bzAbgeleiteteWerte()` deckelt intern mit `?? 0`, die Dauer bleibt korrekt.
    const basis = { Beginn: bz.Beginn, Ende: bz.Ende, Pause: bz.Pause || undefined };
    return { ...basis, ...bzAbgeleiteteWerte(basis) };
  });
  const beMitDauer = beRaw.map(be => {
    const basis = {
      Tag: be.Tag,
      Auftragsnummer: be.Auftragsnummer,
      Beginn: be.Beginn,
      Ende: be.Ende,
      LRE: be.LRE,
      PrivatKm: be.PrivatKm ?? 0,
    };
    return { ...basis, ...beAbgeleiteteWerte(basis, privatKmSatz) };
  });

  // Bereitschaftszulage: "Differenz BZ-BE" live aus denselben Zeilen wie die gedruckte Dauer-Spalte,
  // nicht aus dem Storage-Cache `datenBerechnung` (koennte veraltet sein).
  const bereitschaftMinuten = bzMitDauer.reduce((s, r) => s + r.Dauer, 0) - beMitDauer.reduce((s, r) => s + r.Dauer, 0);
  return {
    Daten: { BZ: bzMitDauer, BE: beMitDauer },
    Bereitschaftszulage: bereitschaftszulageAbgeleiteteWerte(bereitschaftMinuten, vorgabenU.Pers.TB, vorgabenGeld),
  };
}
