import type { IVorgabeValue, TarifBesoldung, ListenGruppe, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { ZULAGEN_CATALOG, ZulageEntryUnit } from '@otto-kirchheim/nebengeld-shared';
import { alsMinuten, alsZahl, alsZeitstempelMinuten, FORMAT, ZEILEN_OPS } from './aggregatoren';
import type { IPdfBereitschaftseinsatz, IPdfBereitschaftszeitraum, IPdfEWT, IPdfNebengeld } from './pdfDaten';

const STUNDE = 60;

/**
 * Dauer zwischen zwei `"HH:mm"`-Zeiten in Minuten (Mitternacht-Wrap via `zeitdifferenz`). Ohne einen der
 * Werte gibt es keine Dauer -- eine Differenz gegen `0` täuschte sonst eine Zeitspanne vor.
 *
 * @param ende - Endzeit `"HH:mm"`.
 * @param beginn - Startzeit `"HH:mm"`.
 * @returns Dauer in Minuten; `0`, wenn einer der Werte fehlt.
 */
function dauerMinuten(ende: string | undefined, beginn: string | undefined): number {
  if (!ende || !beginn) return 0;
  return ZEILEN_OPS.zeitdifferenz([alsMinuten(ende), alsMinuten(beginn)]);
}

export interface EwtAbgeleiteteWerte {
  DauerWohnung: string;
  DauerErsteTkgSt: string;
  Wohnung8bis14: boolean;
  Wohnung14bis24: boolean;
  WohnungUeber24: boolean;
  BeamterUeber8Wohnung: boolean;
  TkgSt8bis24: boolean;
  TkgStUeber24: boolean;
}

/**
 * Vorberechnete Zeiten/Ankreuzfelder einer EWT-Zeile. `beamter` (= `VorgabenU.Pers.TB !== 'Tarifkraft'`)
 * kommt nicht aus der Zeile; `BeamterUeber8Wohnung` ist der einzige feldübergreifende Fall.
 *
 * Die Boolean-Felder im Editor über `Bedingung.bereich: { von: 1, bis: 2 }` als Ankreuz-Quelle
 * verwenden, nicht über `werte` (nur für `string`-Auswahl gebaut); `alsVergleichswert` macht `true`/`false`
 * zu `1`/`0`.
 *
 * `WohnungUeber24`/`TkgStUeber24` sind mit den reinen Uhrzeit-Feldern nie erreichbar (höchstens ein
 * Mitternachtswechsel, Gesamtspanne auf 20h gedeckelt), aber symmetrisch zu den anderen Bändern gebaut.
 *
 * @param zeile - EWT-Zeile mit Wohnung- (`abWE`/`anWE`) und erster TkgSt-Zeit (`ab1E`/`an1E`).
 * @param beamter - `true` für Beamte (`TB !== 'Tarifkraft'`).
 * @returns Dauern als Text sowie die Ankreuzfelder der Zeitbänder.
 */
export function ewtAbgeleiteteWerte(
  zeile: Pick<IPdfEWT, 'abWE' | 'anWE' | 'ab1E' | 'an1E'>,
  beamter: boolean,
): EwtAbgeleiteteWerte {
  const dauerWohnung = dauerMinuten(zeile.anWE, zeile.abWE);
  const dauerErsteTkgSt = dauerMinuten(zeile.an1E, zeile.ab1E);

  return {
    DauerWohnung: FORMAT.stunden(dauerWohnung),
    DauerErsteTkgSt: FORMAT.stunden(dauerErsteTkgSt),
    Wohnung8bis14: dauerWohnung > 8 * STUNDE && dauerWohnung <= 14 * STUNDE,
    Wohnung14bis24: dauerWohnung > 14 * STUNDE && dauerWohnung <= 24 * STUNDE,
    WohnungUeber24: dauerWohnung > 24 * STUNDE,
    BeamterUeber8Wohnung: beamter && dauerWohnung > 8 * STUNDE,
    TkgSt8bis24: dauerErsteTkgSt > 8 * STUNDE && dauerErsteTkgSt <= 24 * STUNDE,
    TkgStUeber24: dauerErsteTkgSt > 24 * STUNDE,
  };
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

export interface EzAbgeleiteteWerte {
  /** `"Beginn-Ende"`, z.B. `"07:00-15:45"` -- eine Spalte hat keine `Feld.quellen`/`trenner`-Verkettung. */
  Arbeitszeit: string;
}

/**
 * Arbeitszeit einer Nebengeld-Zeile als `"Beginn-Ende"`. Vorberechnet, weil `Spalte` (anders als `Feld`)
 * keine `quellen`/`trenner`-Verkettung kennt.
 *
 * @param zeile - Nebengeld-Zeile mit `Beginn` und `Ende`.
 * @returns `Arbeitszeit` als `"Beginn-Ende"`.
 */
export function ezAbgeleiteteWerte(zeile: Pick<IPdfNebengeld, 'Beginn' | 'Ende'>): EzAbgeleiteteWerte {
  return { Arbeitszeit: `${zeile.Beginn}-${zeile.Ende}` };
}

type ZulagenGeldSatz = Pick<IVorgabeValue, 'A' | 'B' | 'C' | 'Fahrentsch' | 'SIPO' | 'GKR'>;

/**
 * Geldwert eines einzelnen Zulagen-Codes -- gleiche Formel wie `N_ZULAGEN_CALC` in
 * `calculateBerechnungRows.ts`, dort je `paymentHint` über die ganze Kategorie, hier für EINEN Code.
 * `wert` ist bei `ZulageEntryUnit.Minuten`-Codes Minuten (auf volle Stunden gerundet), sonst eine
 * Stückzahl. Unbekannter Code oder fehlender Satz ergibt 0 statt eines Absturzes.
 *
 * @param code - Zulagen-Code aus `ZULAGEN_CATALOG`.
 * @param wert - Minuten bei Minuten-Codes, sonst Stückzahl.
 * @param geldMonat - Sätze des Monats (A, B, C, Fahrentschädigung, SIPO, Ganzkörperreinigung).
 * @returns Geldwert in Euro; `0` bei unbekanntem Code oder fehlendem Satz.
 */
export function geldwertZulagenCode(code: string, wert: number, geldMonat: ZulagenGeldSatz): number {
  /**
   * Satz aus `geldMonat`.
   *
   * @param feld - Name des Satzes.
   * @returns Satz oder `0`, wenn er fehlt.
   */
  const satz = (feld: keyof ZulagenGeldSatz): number => geldMonat[feld] ?? 0;
  switch (ZULAGEN_CATALOG.find(z => z.code === code)?.paymentHint) {
    case 'Fahrentschaedigung':
      return wert * satz('Fahrentsch');
    case 'A':
      return Math.round(wert / 60) * satz('A');
    case 'B':
      return Math.round(wert / 60) * satz('B');
    case 'C':
      return Math.round(wert / 60) * satz('C');
    case 'C+A':
      return Math.round(wert / 60) * (satz('C') + satz('A'));
    case 'C+B':
      return Math.round(wert / 60) * (satz('C') + satz('B'));
    case 'C*9':
      return wert * satz('C') * 9;
    case 'SIPO':
      return Math.round(wert / 60) * satz('SIPO');
    case 'Ganzkoerperreinigung':
      return wert * satz('GKR');
    default:
      return 0;
  }
}

/**
 * Bereinigte Summe [Std.] eines Zulagen-Codes: Minuten-Codes auf volle Stunden gerundet (wie in
 * `geldwertZulagenCode()`). Stück-Codes und unbekannte Codes haben keine Umrechnung -> `undefined`
 * (Renderer zeigt `"-"`).
 *
 * @param code - Zulagen-Code aus `ZULAGEN_CATALOG`.
 * @param wert - Minuten (bei Minuten-Codes).
 * @returns Volle Stunden, oder `undefined` für Stück- und unbekannte Codes.
 */
export function bereinigteZulagenStunden(code: string, wert: number): number | undefined {
  const eintrag = ZULAGEN_CATALOG.find(z => z.code === code);
  return eintrag?.entryRule.unit === ZulageEntryUnit.Minuten ? Math.round(wert / 60) : undefined;
}

/**
 * Alle Zulagen-Einträge einer Listen-Gruppe über mehrere Zeilen (Code + Wert). Einträge ohne
 * String-Code oder aus einer Nicht-Array-Quelle fallen raus. Leer = die Spalte trägt keine Zulage;
 * die Aufrufer geben dann `undefined` statt `0` zurück.
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @returns Alle Einträge mit Code und Zahlenwert.
 */
function zulagenEintraegeGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
): { code: string; wert: number }[] {
  return rows.flatMap(zeile => {
    const eintraege = zeile[gruppe.quelle];
    if (!Array.isArray(eintraege)) return [];
    return eintraege.flatMap((e: unknown) => {
      const eintrag = e as Zeile;
      const code = eintrag[gruppe.schluessel];
      return typeof code === 'string' ? [{ code, wert: alsZahl(eintrag[gruppe.wert]) }] : [];
    });
  });
}

/**
 * Geldwert ALLER Einträge einer Listen-Gruppe zusammen, je mit dem EIGENEN Code aus
 * `zeile[gruppe.schluessel]` (Gesamtsumme über alle Zulagen-Spaltenplätze). Unbekannter Code trägt `0`
 * bei. Ohne Eintrag `undefined` (leere Summenzelle).
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @param geldMonat - Sätze des Monats.
 * @returns Summe in Euro, `undefined` ohne Eintrag.
 */
export function summeGeldwertGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
  geldMonat: ZulagenGeldSatz,
): number | undefined {
  const eintraege = zulagenEintraegeGruppe(rows, gruppe);
  if (eintraege.length === 0) return undefined;
  return eintraege.reduce((s, e) => s + geldwertZulagenCode(e.code, e.wert, geldMonat), 0);
}

/**
 * Bereinigte Summe [Std.] ALLER Einträge einer Listen-Gruppe -- wie `summeGeldwertGruppe()` mit
 * `bereinigteZulagenStunden()`. Stück-Codes tragen `0` bei (anders als die Einzelzelle mit `"-"`, siehe
 * `sonderZeileZelleWert()`): eine Summe ohne den nicht umrechenbaren Anteil bleibt sinnvoll.
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @returns Summe in Stunden, `undefined` ohne Eintrag.
 */
export function summeBereinigtGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
): number | undefined {
  const eintraege = zulagenEintraegeGruppe(rows, gruppe);
  if (eintraege.length === 0) return undefined;
  return eintraege.reduce((s, e) => s + (bereinigteZulagenStunden(e.code, e.wert) ?? 0), 0);
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
