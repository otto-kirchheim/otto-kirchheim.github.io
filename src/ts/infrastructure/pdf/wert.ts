import { FORMAT, OPS, alsVergleichswert, datumMitFrist, get, listenBeschriftung, schluesselAufPlatz } from '@otto-kirchheim/nebengeld-shared';
import type { Berechnet, Daten, Feld, FeldBedingung, ListenAufloesung, Zeile } from '@otto-kirchheim/nebengeld-shared';

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
  /** Platzvergabe der dynamischen Spaltengruppen je Tabelle -- Grundlage der Spaltenüberschriften.
   * Einmal je Dokument bestimmt, damit auf jeder Seite dieselbe Zulage über derselben Spalte steht. */
  listen: Record<string, ListenAufloesung>;
  /** Erzeugungszeitpunkt -- als Wert im Kontext statt `new Date()` im Renderer, damit das
   * Unterschriftsdatum und der Platzhalter `{heute}` testbar bleiben. */
  heute: Date;
}

/** Ohne `tabelle` laufen die Zeilen aller Tabellen zusammen in die Rechnung. */
function ausKontext(quelle: TabellenZeilen, tabelle: string | undefined): Zeile[] {
  if (tabelle !== undefined) return quelle[tabelle] ?? [];
  return Object.values(quelle).flat();
}

const PLATZHALTER = /\{([^{}]+)\}/g;

/**
 * Seitenzahl-Platzhalter mit optionalem Versatz: `{seite}`, `{seite-1}`, `{seite + 1}`, `{seiten-1}`.
 * Bewusst nur ganzzahliges Plus/Minus auf den beiden Seitenzahlen statt einer allgemeinen Formel --
 * gebraucht wird der Nachbar ("Übertrag von Seite 2", "Fortsetzung auf Seite 4"), und alles
 * darüber hinaus wäre eine Ausdruckssprache im Fließtext mit entsprechendem Fehlerpotenzial.
 */
const SEITEN_PLATZHALTER = /^(seite|seiten)\s*([+-]\s*\d+)?$/;

/**
 * Alle Platzhalternamen eines festen Textes, die tatsaechlich aus den Nutzdaten kommen -- die vom
 * Kontext bedienten (`seite`, `seiten`, `heute`) fallen raus. Die Testdaten-Vorschau braucht das,
 * um genau diese Pfade mit Beispielwerten zu belegen.
 */
export function datenPlatzhalter(text: string): string[] {
  return [...text.matchAll(PLATZHALTER)]
    .map(treffer => treffer[1]!.trim())
    .filter(pfad => pfad !== 'heute' && !SEITEN_PLATZHALTER.test(pfad));
}

function formatiere(roh: unknown, f: Feld): string {
  if (roh === null || roh === undefined) return '';
  return f.format ? FORMAT[f.format](roh) : String(roh);
}

/**
 * Ersetzt `{name}` in festen Texten: `{seite}`/`{seiten}` liefern die Seitenzahlen (wahlweise mit
 * Versatz, siehe `SEITEN_PLATZHALTER`), `{heute}` das Erzeugungsdatum, jeder andere Name wird als
 * Datenpfad aufgelöst. Unbekannte Pfade werden zu einem leeren String, damit kein roher Platzhalter
 * im fertigen PDF landet.
 */
function ersetzePlatzhalter(text: string, daten: Daten, kontext: Kontext): string {
  return text.replace(PLATZHALTER, (_treffer, name: string) => {
    const pfad = name.trim();
    const seitenTreffer = SEITEN_PLATZHALTER.exec(pfad);
    if (seitenTreffer) {
      const basis = seitenTreffer[1] === 'seite' ? kontext.seite : kontext.seiten;
      // Leerzeichen im Versatz entfernen, damit `{seite - 1}` genauso liest wie `{seite-1}`.
      const versatz = seitenTreffer[2] ? Number(seitenTreffer[2].replace(/\s+/g, '')) : 0;
      return String(basis + versatz);
    }
    if (pfad === 'heute') return FORMAT.datum(kontext.heute);
    const roh = get(daten, pfad);
    return roh === null || roh === undefined ? '' : String(roh);
  });
}

/**
 * Aggregiert über Zeilen (Kopf-/Fuß-Summen) -- gemeinsam genutzt von `Feld.berechnet` (Direktwert)
 * und `Feld.wenn.berechnet` (Bedingung, z.B. "Gesamtsumme > 0"), damit beide dieselbe `$seite`/
 * `$bisher`/`$laufend`/`$alle`-Auflösung und Frist-Behandlung für `letztesDatum` teilen.
 */
function berechneAggregation(b: Berechnet, daten: Daten, kontext: Kontext): unknown {
  const q = b.ueber;
  const rows = q.startsWith('$')
    ? ausKontext(kontext[q as '$seite' | '$bisher' | '$laufend' | '$alle'], b.tabelle)
    : (get(daten, q) as Zeile[] | undefined);
  let roh = OPS[b.op](rows ?? [], b.feld);
  // Das Unterschriftsdatum braucht zusätzlich den Erzeugungstag als Rückfallwert -- der steckt im
  // Kontext, nicht in den Zeilen, und liegt deshalb außerhalb der reinen Aggregation.
  if (b.op === 'letztesDatum') roh = datumMitFrist(roh as number, b.maxTage, kontext.heute);
  return roh;
}

/**
 * Prüft eine Feld-Bedingung -- das Gegenstück zu `trifftBedingung` (shared, zeilenbezogen), aber auf
 * Dokumentebene: `feld` liest einen Datenpfad direkt aus `Daten`, `berechnet` aggregiert über Zeilen.
 * Bleibt hier statt in `shared`, weil sie den frontend-eigenen `Kontext`-Typ braucht.
 */
function trifftFeldBedingung(w: FeldBedingung, daten: Daten, kontext: Kontext): boolean {
  const roh = w.berechnet ? berechneAggregation(w.berechnet, daten, kontext) : get(daten, w.feld!);
  if (w.bereich) {
    const wert = alsVergleichswert(roh);
    return wert >= alsVergleichswert(w.bereich.von) && wert < alsVergleichswert(w.bereich.bis);
  }
  return (w.werte ?? []).includes(roh as string | number);
}

/** Löst ein Feld gegen die Nutzdaten (Direktwert, Bedingung, Text oder Aggregation) auf. */
export function wert(f: Feld, key: string, daten: Daten, kontext: Kontext): string {
  let roh: unknown;

  if (f.listenKopf) {
    // Überschrift eines dynamischen Spaltenplatzes: welcher Schlüssel dort steht, entscheiden die
    // Daten. Unbelegte Plätze bleiben leer, damit im Formular keine Geisterspalte beschriftet wird.
    const aufloesung = kontext.listen[f.listenKopf.tabelle];
    const schluessel = schluesselAufPlatz(aufloesung, f.listenKopf.gruppe, f.listenKopf.index);
    const gruppe = aufloesung?.gruppen[f.listenKopf.gruppe];
    return schluessel === undefined || !gruppe ? '' : listenBeschriftung(gruppe, schluessel);
  } else if (f.wenn) {
    return trifftFeldBedingung(f.wenn, daten, kontext) ? f.wenn.dann : '';
  } else if (f.text !== undefined) {
    // Platzhalter-Ersetzung liefert bereits fertigen Text -- ein `format` würde ihn nur zerstören.
    return ersetzePlatzhalter(f.text, daten, kontext);
  } else if (f.quellen) {
    // Leere Teile überspringen -- sonst hinterlassen optionale Felder (z.B. Adress2) doppelte
    // oder führende Trennzeichen in der Zelle.
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
