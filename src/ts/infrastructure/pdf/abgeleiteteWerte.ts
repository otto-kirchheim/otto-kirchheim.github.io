import type { IVorgabeValue, TarifBesoldung, ListenGruppe, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { ZULAGEN_CATALOG, ZulageEntryUnit } from '@otto-kirchheim/nebengeld-shared';
import { alsMinuten, alsZahl, alsZeitstempelMinuten, FORMAT, ZEILEN_OPS } from './aggregatoren';
import type { IPdfBereitschaftseinsatz, IPdfBereitschaftszeitraum, IPdfEWT, IPdfNebengeld } from './pdfDaten';

const STUNDE = 60;

/**
 * Dauer zwischen zwei `"HH:mm"`-Zeiten in Minuten, Mitternacht-Wrap über die bestehende
 * `zeitdifferenz`-Rechnung (siehe `ZEILEN_OPS`). Fehlt einer der beiden Werte, gibt es keine
 * Dauer -- eine Differenz gegen `0` würde sonst eine falsche Zeitspanne vortäuschen.
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
 * Vorberechnete Zeiten/Ankreuzfelder für eine EWT-Zeile (Phase 10 PDF-Vorlagen-Pipeline) --
 * ersetzt die Overlay-Rechnung im Editor durch fest verdrahtete, getestete Logik, die jede
 * Version direkt aus dem Datenkatalog wählen kann. `beamter` kommt aus `VorgabenU.Pers.TB`
 * (Konvention im Rest der Codebase: Beamter = `TB !== 'Tarifkraft'`), nicht aus der Zeile selbst
 * -- `BeamterUeber8Wohnung` ist der einzige hier feldübergreifende Fall.
 *
 * Die sechs Boolean-Felder im Editor als Ankreuz-Quelle über `Bedingung.bereich: { von: 1, bis: 2 }`
 * verwenden, NICHT über `werte` -- `werte` ist UI-seitig nur für Checkbox-/Freitext-Auswahl aus
 * `string`-Werten gebaut (`alsVergleichswert(true) === 1`/`alsVergleichswert(false) === 0` macht den
 * `bereich`-Vergleich funktionsfähig, ohne den Editor oder das Typsystem anzufassen).
 */
// `WohnungUeber24`/`TkgStUeber24` sind mit dem aktuellen Datenmodell strukturell nie erreichbar --
// abWE/anWE/ab1E/an1E sind reine Uhrzeit-Felder (kein Datum, `type="time"` im Editor), die
// Reihenfolge-Validierung erlaubt höchstens einen Mitternachtswechsel und deckelt die Gesamtspanne
// auf 20h. Bewusst trotzdem exakt wie spezifiziert gebaut (User-Rückfrage 2026-08-21) -- symmetrisch
// zu den anderen Bändern, kein Sonderfall im Code, greift automatisch, falls die Zeitfelder später
// echte mehrtägige Spannen abbilden.
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
  /** Minuten, nicht HH:mm -- siehe Modulkommentar. */
  Dauer: number;
}

/**
 * Dauer eines Bereitschaftszeitraums in Minuten (Phase 11 PDF-Vorlagen-Pipeline) -- bewusst eine
 * Zahl statt `FORMAT.stunden`-Text (anders als bei EWT), User-Vorgabe. `Beginn`/`Ende` sind volle
 * Zeitstempel (siehe `IPdfBereitschaftszeitraum`), ein Zeitraum darf über Tage laufen, deshalb
 * `zeitspanne` (keine Mitternachts-Korrektur wie bei `zeitdifferenz`). `Pause` wird ADDIERT, wie
 * `aktualisiereBerechnung.ts` (Bereitschaft zählt inkl. Pause als Dienstzeit) -- ein früherer
 * Subtraktions-Fix war falsch (widersprach der produktiv genutzten Bereitschaftszulage-Berechnung)
 * und wurde korrigiert.
 */
export function bzAbgeleiteteWerte(
  zeile: Pick<IPdfBereitschaftszeitraum, 'Beginn' | 'Ende' | 'Pause'>,
): BzAbgeleiteteWerte {
  const minuten =
    ZEILEN_OPS.zeitspanne([alsZeitstempelMinuten(zeile.Ende), alsZeitstempelMinuten(zeile.Beginn)]) + zeile.Pause;
  return { Dauer: minuten };
}

export interface BeAbgeleiteteWerte {
  /** Minuten, nicht HH:mm -- siehe Modulkommentar. */
  Dauer: number;
  /** Rohe km, nur für Tarifkraft gedruckt -- sonst `undefined` (siehe `PrivatKmBetrag`). */
  PrivatKm?: number;
  /** Euro, auf 2 Nachkommastellen gerundet, nur für Beamte gedruckt -- sonst `undefined`. */
  PrivatKmBetrag?: number;
}

/**
 * Dauer und Privat-km-Wert eines Bereitschaftseinsatzes (Phase 11) -- `Beginn`/`Ende` sind reine
 * `"HH:mm"`-Uhrzeiten eines Tages (siehe `IPdfBereitschaftseinsatz`), deshalb `zeitdifferenz`
 * (ergänzt über Mitternacht, wie bei `ewtAbgeleiteteWerte`).
 *
 * `privatKmSatz` (Euro/km) kommt vorberechnet vom Aufrufer -- welcher Satz gilt (Tarifkraft vs.
 * Beamter, `VorgabenGeld.PrivatPKWTarif`/`PrivatPKWBeamter`) ist reine Konfigurations-Auswahl ohne
 * eigene Testlogik, anders als die Zeitband-Schwellen bei `ewtAbgeleiteteWerte`. `Math.round(... *
 * 100) / 100` vermeidet Fließkomma-Rauschen (z.B. `12 * 0.27`), das sich über mehrere Zeilen zu
 * einer sichtbar falschen Summe aufaddieren würde.
 *
 * Gedruckt wird je Person nur EINE der beiden Spalten (Tarifkraft: rohe km / Beamter: Euro-Betrag,
 * User-Vorgabe 2026-08-25) -- der jeweils andere Wert bleibt `undefined` statt einer Zahl, die im
 * Formular gar nicht vorgesehen ist. Der Betrag wird dafür IMMER aus der rohen `zeile.PrivatKm`
 * berechnet, bevor `PrivatKm` selbst ggf. auf `undefined` geht (Reihenfolge wichtig).
 */
export function beAbgeleiteteWerte(
  zeile: Pick<IPdfBereitschaftseinsatz, 'Beginn' | 'Ende'> & { PrivatKm: number },
  privatKmSatz: number,
  beamter: boolean,
): BeAbgeleiteteWerte {
  const privatKmBetrag = Math.round(zeile.PrivatKm * privatKmSatz * 100) / 100;
  return {
    Dauer: ZEILEN_OPS.zeitdifferenz([alsMinuten(zeile.Ende), alsMinuten(zeile.Beginn)]),
    PrivatKm: beamter ? undefined : zeile.PrivatKm,
    PrivatKmBetrag: beamter ? privatKmBetrag : undefined,
  };
}

export interface EzAbgeleiteteWerte {
  /** `"Beginn-Ende"`, z.B. `"07:00-15:45"` -- eine Spalte hat keine `Feld.quellen`/`trenner`-Verkettung. */
  Arbeitszeit: string;
}

/**
 * Zusammengesetzte Arbeitszeit-Anzeige für eine Nebengeld-Zeile (Phase 12 PDF-Vorlagen-Pipeline) --
 * `Spalte` (anders als `Feld`) kann mehrere Datenpfade nicht per `quellen`/`trenner` in einer Zelle
 * verketten, deshalb wie bei EWT/Bereitschaft vorberechnet statt im Renderer generisch gelöst.
 */
export function ezAbgeleiteteWerte(zeile: Pick<IPdfNebengeld, 'Beginn' | 'Ende'>): EzAbgeleiteteWerte {
  return { Arbeitszeit: `${zeile.Beginn}-${zeile.Ende}` };
}

type ZulagenGeldSatz = Pick<IVorgabeValue, 'A' | 'B' | 'C' | 'Fahrentsch' | 'SIPO' | 'GKR'>;

/**
 * Geldwert eines einzelnen Zulagen-Codes (Phase 12, PDF-Vorlagen-Pipeline) -- repliziert exakt die
 * Formel aus `calculateBerechnungRows.ts::N_ZULAGEN_CALC` (Berechnung-Tab), dort je `paymentHint`
 * auf eine ganze Kategorie (alle Codes desselben Satzes zusammen) angewandt, hier auf den Wert
 * EINES Codes -- mehrere Codes teilen sich denselben `paymentHint`/Satz (siehe `ZULAGEN_CATALOG`).
 * `wert` ist Minuten bei `ZulageEntryUnit.Minuten`-Codes (A/B/C/C+A/C+B/SIPO, gerundet auf volle
 * Stunden wie im Original), sonst eine reine Stückzahl (Fahrentschädigung, C*9, Ganzkörper-
 * reinigung). Unbekannter Code (kein Katalogeintrag) oder fehlender Satz ergibt 0 statt eines
 * Absturzes -- Fahrlässigkeit bei der Eingabe soll keinen kaputten Export verursachen.
 */
export function geldwertZulagenCode(code: string, wert: number, geldMonat: ZulagenGeldSatz): number {
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
 * Bereinigte Summe [Std.] eines Zulagen-Codes (Phase 13, Sonderzeilen) -- Minuten-Codes (siehe
 * `ZulageEntryUnit.Minuten` in `ZULAGEN_CATALOG`) gerundet auf volle Stunden, exakt wie der erste
 * Rechenschritt in `geldwertZulagenCode()`. Stück-Codes (Fahrentschädigung, C*9, Ganzkörper-
 * reinigung) haben keine Std.-Umrechnung -- `undefined` statt einer irreführenden Zahl, der
 * Renderer zeigt dafür `"-"`. Unbekannter Code ebenfalls `undefined`.
 */
export function bereinigteZulagenStunden(code: string, wert: number): number | undefined {
  const eintrag = ZULAGEN_CATALOG.find(z => z.code === code);
  return eintrag?.entryRule.unit === ZulageEntryUnit.Minuten ? Math.round(wert / 60) : undefined;
}

/**
 * Geldwert ALLER Einträge einer Listen-Gruppe zusammen (Phase 13, Sonderzeilen) -- anders als
 * `geldwertZulagenCode()` nicht für EINEN vorgegebenen Code, sondern je Eintrag mit dessen EIGENEM
 * Code aus `zeile[gruppe.schluessel]`: Grundlage der Gesamtsumme über alle Zulagen-Spaltenplätze
 * einer Tabelle (`Berechnet.liste` ohne `index`), unabhängig davon, welcher Code gerade auf welchem
 * Platz steht. Ein Eintrag ohne (String-)Code oder mit unbekanntem Code trägt `0` bei, statt die
 * gesamte Summe zu verwerfen.
 */
export function summeGeldwertGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
  geldMonat: ZulagenGeldSatz,
): number {
  return rows.reduce((summe, zeile) => {
    const eintraege = zeile[gruppe.quelle];
    if (!Array.isArray(eintraege)) return summe;
    return (
      summe +
      eintraege.reduce((s: number, e: unknown) => {
        const eintrag = e as Zeile;
        const code = eintrag[gruppe.schluessel];
        return typeof code === 'string' ? s + geldwertZulagenCode(code, alsZahl(eintrag[gruppe.wert]), geldMonat) : s;
      }, 0)
    );
  }, 0);
}

/**
 * Bereinigte Summe [Std.] ALLER Einträge einer Listen-Gruppe zusammen (Phase 13, Sonderzeilen) --
 * wie `summeGeldwertGruppe()`, aber über `bereinigteZulagenStunden()` statt `geldwertZulagenCode()`.
 * Stück-Codes (keine Std.-Umrechnung) tragen `0` bei statt die Summe zu verwerfen -- anders als bei
 * einer einzelnen Zelle (dort `"-"`, siehe `sonderZeileZelleWert()`) ist eine Gesamtsumme ohne den
 * nicht umrechenbaren Anteil weiterhin eine sinnvolle Zahl.
 */
export function summeBereinigtGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
): number {
  return rows.reduce((summe, zeile) => {
    const eintraege = zeile[gruppe.quelle];
    if (!Array.isArray(eintraege)) return summe;
    return (
      summe +
      eintraege.reduce((s: number, e: unknown) => {
        const eintrag = e as Zeile;
        const code = eintrag[gruppe.schluessel];
        return typeof code === 'string' ? s + (bereinigteZulagenStunden(code, alsZahl(eintrag[gruppe.wert])) ?? 0) : s;
      }, 0)
    );
  }, 0);
}

export interface BereitschaftszulageWerte {
  /** Tarifkraft/Beamter als eigenständiges Druckfeld -- `tarifKraft` selbst ist einer von drei
   * `TB_VALUES` (zwei Besoldungsgruppen + Tarifkraft), fürs PDF zählt aber nur diese Unterscheidung
   * (Konvention im Rest der Codebase: Beamter = `TB !== 'Tarifkraft'`). Immer gesetzt, unabhängig
   * von `bereitschaftMinuten`. */
  TarifBeamter: 'Tarifkraft' | 'Beamter';
  BereitschaftsMinuten?: number;
  SummeTarif?: number;
  SummeBeamter1?: number;
  SummeBeamter2?: number;
  SummeBeamter3?: number;
  GeldwertBeamter?: number;
}

/**
 * Bereitschaftszulage-Zwischenwerte (Phase 11, Nachtrag) -- Arithmetik aus
 * `calculateBerechnungRows.ts` (Berechnung-Tab), aufgeschlüsselt in benannte Zwischenschritte für
 * den Druck. `bereitschaftMinuten` (="Differenz BZ-BE" in Minuten) wird vom Aufrufer live aus den
 * BZ-/BE-Zeilen desselben Exports berechnet, NICHT hier -- bewusst kein Storage-Zugriff (würde
 * entweder veraltete Werte riskieren oder, um das zu vermeiden, ein `data:changed`-Event
 * erzwingen müssen, das nebenbei einen kompletten AutoSave-Zyklus auslösen würde, siehe
 * `infrastructure/autoSave/autoSave.ts`).
 *
 * `0` Minuten -> nur `TarifBeamter` gesetzt (wie `IBerechnungMonatsErgebnis`: keine Anzeige statt
 * `0` für einen Monat ganz ohne Bereitschaft). Von den Geld-Zwischenwerten wird nur EIN Zweig
 * befüllt, der jeweils andere bleibt `undefined` -- reicht als "Anzeige abhängig von TB", ohne
 * eigenes Sichtbarkeits-Feature. `SummeTarif` ist bewusst NICHT mit einem Satz multipliziert (reine
 * Stundenzahl); nur `SummeBeamter3` ist ein Geldwert, `SummeBeamter1`/`SummeBeamter2` bleiben
 * Ganzzahlen (Minuten bzw. Sätze).
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
    // Gerundet wie PrivatKmBetrag (Fließkomma-Rauschen, z.B. 11 * 16.37 === 180.07000000000002).
    SummeBeamter3: Math.round(summeBeamter2 * geldwertBeamter * 100) / 100,
    GeldwertBeamter: geldwertBeamter,
  };
}
