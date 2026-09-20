import {
  FORMAT,
  OPS,
  alsVergleichswert,
  datumMitFrist,
  standardText,
  summeGruppe,
  summeUeberListe,
  trifftBedingung,
} from './aggregatoren';
import { get } from './get';
import { listenBeschriftung, schluesselAufPlatz } from './listen';
import type { ListenAufloesung } from './listen';
import {
  bereinigteZulagenStunden,
  geldwertZulagenCode,
  summeBereinigtGruppe,
  summeGeldwertGruppe,
} from './abgeleiteteWerte';
import type {
  Berechnet,
  Daten,
  Feld,
  FeldBedingung,
  FormatName,
  IVorgabeValue,
  Spalte,
  SonderZeileZelle,
  Zeile,
} from '@otto-kirchheim/nebengeld-shared';

/** Zeilen je Tabellen-Key -- eine Version kann mehrere Datentabellen tragen. */
export type TabellenZeilen = Record<string, Zeile[]>;

export interface Kontext {
  /** Zeilen der aktuellen Seite */
  $seite: TabellenZeilen;
  /** Zeilen aller vorherigen Seiten (Übertrag) */
  $bisher: TabellenZeilen;
  /** Zeilen aller Vorseiten PLUS dieser Seite (laufende Summe / Zwischensumme bis hierher) */
  $laufend: TabellenZeilen;
  /** alle Zeilen des Dokuments (Gesamtsumme) */
  $alle: TabellenZeilen;
  seite: number;
  seiten: number;
  /**
   * Platzvergabe der dynamischen Spaltengruppen je Tabelle (Spaltenüberschriften). Einmal je Dokument
   * bestimmt, damit auf jeder Seite dieselbe Zulage über derselben Spalte steht.
   */
  listen: Record<string, ListenAufloesung>;
  /** Erzeugungszeitpunkt; im Kontext statt `new Date()`, damit Unterschriftsdatum und `{heute}` testbar sind. */
  heute: Date;
  /**
   * true nur bei gewählter "Digital"-Signatur (`SignaturErgebnis.digital`) -- steuert `Feld.nurBeiSignatur`.
   * Bei gezeichneter oder fehlender Unterschrift (z.B. später auf Papier) bleibt das Datum richtig; nur
   * bei "Digital" passiert die Signatur erst zu einem unbekannten Zeitpunkt.
   */
  digitaleSignatur: boolean;
}

/**
 * Ohne `tabellen` (oder leer) laufen die Zeilen ALLER Tabellen in die Rechnung, mit mehreren Tabellen
 * ihre Zeilen zusammen in EINE Rechnung.
 *
 * @param quelle - Zeilen je Tabelle (`$seite`, `$bisher`, `$laufend` oder `$alle` des Kontexts).
 * @param tabellen - Tabellen-Keys, `undefined`/leer = alle.
 * @returns Die zusammengefassten Zeilen.
 */
function ausKontext(quelle: TabellenZeilen, tabellen: string[] | undefined): Zeile[] {
  if (tabellen !== undefined && tabellen.length > 0) return tabellen.flatMap(t => quelle[t] ?? []);
  return Object.values(quelle).flat();
}

const PLATZHALTER = /\{([^{}]+)\}/g;

/**
 * Seitenzahl-Platzhalter mit Versatz: `{seite}`, `{seite-1}`, `{seite + 1}`, `{seiten-1}`. Bewusst nur
 * ganzzahliges Plus/Minus (gebraucht wird der Nachbar, "Übertrag von Seite 2"), keine Ausdruckssprache.
 */
const SEITEN_PLATZHALTER = /^(seite|seiten)\s*([+-]\s*\d+)?$/;

/**
 * Trennt `{Pfad}` von `{Pfad:Format}`. Ein unbekanntes `FormatName` wird ignoriert statt den Platzhalter
 * zu zerstören (Tippfehler).
 *
 * @param name - Inhalt zwischen den Klammern, z.B. `Pfad` oder `Pfad:Format`.
 * @returns Datenpfad und, falls bekannt, das gewünschte Format.
 */
function zerlegePlatzhalter(name: string): { pfad: string; format?: FormatName } {
  const trimmed = name.trim();
  const doppelpunkt = trimmed.indexOf(':');
  if (doppelpunkt === -1) return { pfad: trimmed };
  const pfad = trimmed.slice(0, doppelpunkt).trim();
  const format = trimmed.slice(doppelpunkt + 1).trim();
  return format in FORMAT ? { pfad, format: format as FormatName } : { pfad };
}

/**
 * Alle Platzhalternamen eines festen Textes, die aus den Nutzdaten kommen (ohne `seite`, `seiten`,
 * `heute`) -- die Testdaten-Vorschau belegt genau diese Pfade.
 *
 * @param text - Fester Text mit `{…}`-Platzhaltern.
 * @returns Datenpfade ohne Format-Suffix.
 */
export function datenPlatzhalter(text: string): string[] {
  return [...text.matchAll(PLATZHALTER)]
    .map(treffer => zerlegePlatzhalter(treffer[1]!).pfad)
    .filter(pfad => pfad !== 'heute' && !SEITEN_PLATZHALTER.test(pfad));
}

/**
 * Formatiert einen Feldwert (`format` des Feldes, sonst `standardText`).
 *
 * @param roh - Rohwert des Feldes.
 * @param f - Feld mit optionalem `format`.
 * @returns Formatierter Text; leer bei `null`/`undefined`.
 */
function formatiere(roh: unknown, f: Feld): string {
  if (roh === null || roh === undefined) return '';
  return f.format ? FORMAT[f.format](roh) : standardText(roh);
}

/**
 * Ersetzt `{name}` in festen Texten: `{seite}`/`{seiten}` (Versatz siehe `SEITEN_PLATZHALTER`), `{heute}`,
 * sonst Datenpfad. Unbekannte Pfade werden leer, damit kein roher Platzhalter im PDF landet. Das Format
 * lässt sich erzwingen (`{heute:datumKurz}`), sonst greift der Fallback unformatierter Felder.
 *
 * @param text - Fester Text mit `{…}`-Platzhaltern.
 * @param daten - Nutzdaten für die Datenpfade.
 * @param kontext - Seitenzahlen und Erzeugungsdatum.
 * @returns Der Text mit ersetzten Platzhaltern.
 */
function ersetzePlatzhalter(text: string, daten: Daten, kontext: Kontext): string {
  return text.replace(PLATZHALTER, (_treffer, name: string) => {
    const { pfad, format } = zerlegePlatzhalter(name);
    const seitenTreffer = SEITEN_PLATZHALTER.exec(pfad);
    if (seitenTreffer) {
      const basis = seitenTreffer[1] === 'seite' ? kontext.seite : kontext.seiten;
      // Leerzeichen im Versatz entfernen: `{seite - 1}` liest wie `{seite-1}`.
      const versatz = seitenTreffer[2] ? Number(seitenTreffer[2].replace(/\s+/g, '')) : 0;
      return String(basis + versatz);
    }
    if (pfad === 'heute') return FORMAT[format ?? 'datum'](kontext.heute);
    const roh = get(daten, pfad);
    if (roh === null || roh === undefined) return '';
    return format ? FORMAT[format](roh) : standardText(roh);
  });
}

/**
 * Aggregiert über Zeilen (Kopf-/Fuß-Summen) für `Feld.berechnet` und `Feld.wenn.berechnet`, damit beide
 * dieselbe `$seite`/`$bisher`/`$laufend`/`$alle`-Auflösung und Frist-Behandlung teilen.
 *
 * @param b - Aggregation (`ueber`, `op`, `feld`/`liste`, `tabellen`, `maxTage`).
 * @param daten - Nutzdaten (für Datenpfade und `VorgabenGeld`).
 * @param kontext - Zeilen je Seite und Platzvergabe der Listen.
 * @returns Rohwert (Zahl, bei unbelegtem Listenplatz `undefined`).
 */
function berechneAggregation(b: Berechnet, daten: Daten, kontext: Kontext): unknown {
  const q = b.ueber;
  const rows = q.startsWith('$')
    ? ausKontext(kontext[q as '$seite' | '$bisher' | '$laufend' | '$alle'], b.tabellen)
    : (get(daten, q) as Zeile[] | undefined);
  let roh: unknown;
  if (b.liste) {
    const aufloesung = kontext.listen[b.liste.tabelle];
    const gruppe = aufloesung?.gruppen[b.liste.gruppe];
    // `VorgabenGeld` liegt einmal pro Dokument unter `Daten.VorgabenGeld` (`IPdfBase`).
    const geldMonat = (get(daten, 'VorgabenGeld') as IVorgabeValue | undefined) ?? {};
    const art = b.liste.art ?? 'summe';
    if (b.liste.index === undefined) {
      // Gesamtsumme über ALLE Einträge, jeder mit EIGENEM Code -- nicht an einen Platz gebunden.
      if (!gruppe) roh = 0;
      else if (art === 'summeGeld') roh = summeGeldwertGruppe(rows ?? [], gruppe, geldMonat);
      else if (art === 'bereinigt') roh = summeBereinigtGruppe(rows ?? [], gruppe);
      else roh = summeGruppe(rows ?? [], gruppe);
    } else {
      // Derselbe Code wie in der Spaltenüberschrift dieses Platzes (`Feld.listenKopf`): ein fest
      // eingetragener Code liefe an der Überschrift vorbei, wenn sich die Platzbelegung verschiebt.
      const code = schluesselAufPlatz(aufloesung, b.liste.gruppe, b.liste.index);
      if (!gruppe) {
        // Keine Zulagen-Gruppe in dieser Tabelle: 0 (kaputte Konfiguration, keine fehlende Eingabe).
        roh = 0;
      } else if (code === undefined) {
        // Platz ohne Code (diesen Monat keine Zulagenart): leer statt einer 0, die eine echte Nullsumme vortäuschte.
        roh = undefined;
      } else {
        const wert = summeUeberListe(rows ?? [], {
          quelle: gruppe.quelle,
          schluessel: gruppe.schluessel,
          wert: gruppe.wert,
          code,
        });
        if (art === 'summeGeld') roh = geldwertZulagenCode(code, wert, geldMonat);
        else if (art === 'bereinigt') roh = bereinigteZulagenStunden(code, wert) ?? 0;
        else roh = wert;
      }
    }
  } else {
    roh = OPS[b.op](rows ?? [], b.feld);
  }
  // Rückfallwert ist der Erzeugungstag aus dem Kontext, nicht aus den Zeilen -- außerhalb der Aggregation.
  if (b.op === 'letztesDatum') roh = datumMitFrist(roh as number, b.maxTage, kontext.heute);
  return roh;
}

/**
 * Zeilen einer Sonderzeile (`SonderZeile.ueber`), eingegrenzt auf EINE Tabelle -- eine Sonderzeile gehört
 * immer zu genau der Tabelle, auf deren Seite sie steht. Nur `$seite`/`$bisher`/`$laufend`/`$alle`, kein
 * Datenpfad.
 *
 * @param ueber - `$seite`, `$bisher`, `$laufend` oder `$alle`.
 * @param tabelle - Key der Tabelle.
 * @param kontext - Zeilen je Seite.
 * @returns Die Zeilen; leer bei anderem `ueber`.
 */
export function zeilenFuerUeber(ueber: string, tabelle: string, kontext: Kontext): Zeile[] {
  if (!ueber.startsWith('$')) return [];
  return ausKontext(kontext[ueber as '$seite' | '$bisher' | '$laufend' | '$alle'], [tabelle]);
}

/**
 * Wert einer Sonderzeilen-Zelle für EINE Spalte (die x-Position kommt beim Zeichnen, siehe `build.ts`).
 * `rows` kommt einmal pro Sonderzeile aus `zeilenFuerUeber()`.
 *
 * @param zelle - Zellenart (`kopf`, `summe`, `bereinigt`, `summeGeld`) und optionales Format.
 * @param spalte - Spalte, zu der die Zelle gehört.
 * @param tabelleName - Key der Tabelle (für die Platzvergabe der Listen).
 * @param rows - Zeilen der Sonderzeile (aus `zeilenFuerUeber()`).
 * @param daten - Nutzdaten (für `VorgabenGeld`).
 * @param kontext - Platzvergabe der Listen.
 * @returns Zellentext; leer bei unbelegtem Platz, `-` bei `bereinigt` ohne Stundenwert.
 */
export function sonderZeileZelleWert(
  zelle: SonderZeileZelle,
  spalte: Spalte,
  tabelleName: string,
  rows: Zeile[],
  daten: Daten,
  kontext: Kontext,
): string {
  const format = zelle.format ?? spalte.format;
  /**
   * Formatiert mit dem Format der Zelle bzw. Spalte.
   *
   * @param roh - Rohwert.
   * @returns Formatierter Text.
   */
  const formatiere = (roh: unknown): string => (format ? FORMAT[format](roh) : standardText(roh));

  if (zelle.art === 'kopf') {
    // Ohne dynamischen Platz ist das Spalten-Label die Überschrift.
    if (!spalte.listenPlatz) return spalte.label ?? '';
    const aufloesung = kontext.listen[tabelleName];
    const schluessel = schluesselAufPlatz(aufloesung, spalte.listenPlatz.gruppe, spalte.listenPlatz.index);
    const gruppe = aufloesung?.gruppen[spalte.listenPlatz.gruppe];
    return schluessel === undefined || !gruppe ? '' : listenBeschriftung(gruppe, schluessel);
  }

  if (!spalte.listenPlatz) {
    // Ankreuz-Spalte: der Wert entsteht erst je Zeile aus der Bedingung (`spaltenWert.ts`), es gibt
    // nichts Flaches zu summieren -- "Summe" zählt die Zeilen, die die Bedingung erfüllen.
    if (spalte.wenn) return formatiere(rows.filter(z => trifftBedingung(spalte.wenn!, z)).length);
    // Normale Spalte: reguläre Summe, auch ohne Zulagen-Bezug (EA/EWT/Bereitschaft-Fußsummen).
    return formatiere(OPS.summe(rows, spalte.key));
  }

  const aufloesung = kontext.listen[tabelleName];
  const gruppe = aufloesung?.gruppen[spalte.listenPlatz.gruppe];
  const code = schluesselAufPlatz(aufloesung, spalte.listenPlatz.gruppe, spalte.listenPlatz.index);
  // Keine Zulagen-Gruppe in dieser Tabelle: 0 (kaputte Konfiguration).
  if (!gruppe) return formatiere(0);
  // Unbelegter Platz: leer statt einer 0, die eine echte Nullsumme vortäuschte.
  if (code === undefined) return '';
  const summe = summeUeberListe(rows, {
    quelle: gruppe.quelle,
    schluessel: gruppe.schluessel,
    wert: gruppe.wert,
    code,
  });

  if (zelle.art === 'summe') return formatiere(summe);
  if (zelle.art === 'bereinigt') {
    const std = bereinigteZulagenStunden(code, summe);
    return std === undefined ? '-' : formatiere(std);
  }
  const geld = geldwertZulagenCode(code, summe, (get(daten, 'VorgabenGeld') as IVorgabeValue | undefined) ?? {});
  return formatiere(geld);
}

/**
 * Prüft eine Feld-Bedingung auf Dokumentebene (Gegenstück zu `trifftBedingung` je Zeile): `feld` liest
 * einen Datenpfad, `berechnet` aggregiert über Zeilen.
 *
 * @param w - Bedingung (`feld` oder `berechnet`, dazu `werte` oder `bereich`).
 * @param daten - Nutzdaten.
 * @param kontext - Zeilen je Seite.
 * @returns `true`, wenn die Bedingung zutrifft.
 */
function trifftFeldBedingung(w: FeldBedingung, daten: Daten, kontext: Kontext): boolean {
  const roh = w.berechnet ? berechneAggregation(w.berechnet, daten, kontext) : get(daten, w.feld!);
  if (w.bereich) {
    const wert = alsVergleichswert(roh);
    return wert >= alsVergleichswert(w.bereich.von) && wert < alsVergleichswert(w.bereich.bis);
  }
  return (w.werte ?? []).includes(roh as string | number | boolean);
}

/**
 * Löst ein Feld gegen die Nutzdaten (Direktwert, Bedingung, Text oder Aggregation) auf.
 *
 * @param f - Feld (Direktwert, Bedingung, Text, Verkettung oder Aggregation).
 * @param key - Datenpfad des Feldes (bei Direktwert).
 * @param daten - Nutzdaten.
 * @param kontext - Seitenzahlen, Zeilen je Seite, Platzvergabe, Signatur-Flag.
 * @returns Zellentext; leer, wenn nichts anzuzeigen ist.
 */
export function wert(f: Feld, key: string, daten: Daten, kontext: Kontext): string {
  if (f.nurBeiSignatur && kontext.digitaleSignatur) return '';

  let roh: unknown;

  if (f.listenKopf) {
    // Überschrift eines dynamischen Platzes: die Daten entscheiden den Schlüssel; unbelegte Plätze bleiben
    // leer (keine Geisterspalte).
    const aufloesung = kontext.listen[f.listenKopf.tabelle];
    const schluessel = schluesselAufPlatz(aufloesung, f.listenKopf.gruppe, f.listenKopf.index);
    const gruppe = aufloesung?.gruppen[f.listenKopf.gruppe];
    return schluessel === undefined || !gruppe ? '' : listenBeschriftung(gruppe, schluessel);
  } else if (f.wenn) {
    return trifftFeldBedingung(f.wenn, daten, kontext) ? f.wenn.dann : '';
  } else if (f.text !== undefined) {
    // Platzhalter-Ersetzung liefert fertigen Text -- ein `format` würde ihn zerstören.
    return ersetzePlatzhalter(f.text, daten, kontext);
  } else if (f.quellen) {
    // Leere Teile überspringen, sonst bleiben bei optionalen Feldern (Adress2) Trenner zurück.
    return f.quellen
      .map(pfad => formatiere(get(daten, pfad), f))
      .filter(teil => teil !== '')
      .join(f.trenner ?? ' ');
  } else if (f.berechnet) {
    roh = berechneAggregation(f.berechnet, daten, kontext);
  } else {
    roh = get(daten, key);
  }

  return formatiere(roh, f);
}
