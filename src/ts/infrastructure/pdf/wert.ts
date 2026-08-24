import {
  bereinigteZulagenStunden,
  FORMAT,
  OPS,
  alsVergleichswert,
  datumMitFrist,
  geldwertZulagenCode,
  get,
  listenBeschriftung,
  schluesselAufPlatz,
  standardText,
  summeBereinigtGruppe,
  summeGeldwertGruppe,
  summeGruppe,
  summeUeberListe,
  trifftBedingung,
} from '@otto-kirchheim/nebengeld-shared';
import type { Berechnet, Daten, Feld, FeldBedingung, FormatName, IVorgabeValue, ListenAufloesung, Spalte, SonderZeileZelle, Zeile } from '@otto-kirchheim/nebengeld-shared';

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

/** Ohne `tabellen` (oder leeres Array) laufen die Zeilen ALLER Tabellen zusammen in die Rechnung;
 * mit mehreren Tabellen laufen ihre Zeilen zusammen in EINE Rechnung. */
function ausKontext(quelle: TabellenZeilen, tabellen: string[] | undefined): Zeile[] {
  if (tabellen !== undefined && tabellen.length > 0) return tabellen.flatMap(t => quelle[t] ?? []);
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
 * Trennt `{Pfad}` von optionalem `{Pfad:Format}` -- das Format muss ein bekannter `FormatName` sein
 * (siehe `FORMAT`), sonst wird die Angabe stillschweigend ignoriert statt den Platzhalter kaputt zu
 * machen (z.B. bei einem Tippfehler im Formatnamen).
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
 * Alle Platzhalternamen eines festen Textes, die tatsaechlich aus den Nutzdaten kommen -- die vom
 * Kontext bedienten (`seite`, `seiten`, `heute`) fallen raus. Die Testdaten-Vorschau braucht das,
 * um genau diese Pfade mit Beispielwerten zu belegen.
 */
export function datenPlatzhalter(text: string): string[] {
  return [...text.matchAll(PLATZHALTER)]
    .map(treffer => zerlegePlatzhalter(treffer[1]!).pfad)
    .filter(pfad => pfad !== 'heute' && !SEITEN_PLATZHALTER.test(pfad));
}

function formatiere(roh: unknown, f: Feld): string {
  if (roh === null || roh === undefined) return '';
  return f.format ? FORMAT[f.format](roh) : standardText(roh);
}

/**
 * Ersetzt `{name}` in festen Texten: `{seite}`/`{seiten}` liefern die Seitenzahlen (wahlweise mit
 * Versatz, siehe `SEITEN_PLATZHALTER`), `{heute}` das Erzeugungsdatum, jeder andere Name wird als
 * Datenpfad aufgelöst. Unbekannte Pfade werden zu einem leeren String, damit kein roher Platzhalter
 * im fertigen PDF landet. Optional lässt sich das Format erzwingen (`{Pfad:Format}`, z.B.
 * `{VorgabenU.Pers.OE:liste}` oder `{heute:datumKurz}`) -- ohne Angabe greift derselbe Fallback wie
 * bei unformatierten Feldern (`standardText`/`FORMAT.datum`).
 */
function ersetzePlatzhalter(text: string, daten: Daten, kontext: Kontext): string {
  return text.replace(PLATZHALTER, (_treffer, name: string) => {
    const { pfad, format } = zerlegePlatzhalter(name);
    const seitenTreffer = SEITEN_PLATZHALTER.exec(pfad);
    if (seitenTreffer) {
      const basis = seitenTreffer[1] === 'seite' ? kontext.seite : kontext.seiten;
      // Leerzeichen im Versatz entfernen, damit `{seite - 1}` genauso liest wie `{seite-1}`.
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
 * Aggregiert über Zeilen (Kopf-/Fuß-Summen) -- gemeinsam genutzt von `Feld.berechnet` (Direktwert)
 * und `Feld.wenn.berechnet` (Bedingung, z.B. "Gesamtsumme > 0"), damit beide dieselbe `$seite`/
 * `$bisher`/`$laufend`/`$alle`-Auflösung und Frist-Behandlung für `letztesDatum` teilen.
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
    // VorgabenGeld liegt einmal pro Dokument unter Daten.VorgabenGeld (siehe IDownloadBase) --
    // derselbe Weg wie jeder andere Datenpfad, kein eigener Kontext-Eintrag nötig.
    const geldMonat = (get(daten, 'VorgabenGeld') as IVorgabeValue | undefined) ?? {};
    const art = b.liste.art ?? 'summe';
    if (b.liste.index === undefined) {
      // Gesamtsumme über ALLE Einträge der Gruppe, jeder mit seinem EIGENEN Code -- nicht an einen
      // Platz gebunden, deshalb keine schluesselAufPlatz()-Auflösung nötig.
      if (!gruppe) roh = 0;
      else if (art === 'summeGeld') roh = summeGeldwertGruppe(rows ?? [], gruppe, geldMonat);
      else if (art === 'bereinigt') roh = summeBereinigtGruppe(rows ?? [], gruppe);
      else roh = summeGruppe(rows ?? [], gruppe);
    } else {
      // Derselbe zur Laufzeit aufgelöste Code wie die Spaltenüberschrift dieses Platzes (siehe
      // Feld.listenKopf) -- ein fest im Berechnet.liste eingetragener Code würde an der
      // Überschrift vorbeirechnen, sobald sich die monatliche Platzbelegung verschiebt.
      const code = schluesselAufPlatz(aufloesung, b.liste.gruppe, b.liste.index);
      const wert = gruppe && code !== undefined ? summeUeberListe(rows ?? [], { quelle: gruppe.quelle, schluessel: gruppe.schluessel, wert: gruppe.wert, code }) : 0;
      if (code === undefined) roh = wert;
      else if (art === 'summeGeld') roh = geldwertZulagenCode(code, wert, geldMonat);
      else if (art === 'bereinigt') roh = bereinigteZulagenStunden(code, wert) ?? 0;
      else roh = wert;
    }
  } else {
    roh = OPS[b.op](rows ?? [], b.feld);
  }
  // Das Unterschriftsdatum braucht zusätzlich den Erzeugungstag als Rückfallwert -- der steckt im
  // Kontext, nicht in den Zeilen, und liegt deshalb außerhalb der reinen Aggregation.
  if (b.op === 'letztesDatum') roh = datumMitFrist(roh as number, b.maxTage, kontext.heute);
  return roh;
}

/**
 * Zeilen einer Sonderzeile (`SonderZeile.ueber`), eingegrenzt auf EINE Tabelle -- anders als
 * `Berechnet.ueber` braucht eine Sonderzeilen-Zelle nie eine tabellenübergreifende Rechnung, sie
 * gehört immer zu genau der Tabelle, auf deren Seite sie platziert ist. Nur `$seite`/`$bisher`/
 * `$laufend`/`$alle` ergeben hier einen Sinn, ein Datenpfad wie bei `Berechnet.ueber` nicht.
 */
export function zeilenFuerUeber(ueber: string, tabelle: string, kontext: Kontext): Zeile[] {
  if (!ueber.startsWith('$')) return [];
  return ausKontext(kontext[ueber as '$seite' | '$bisher' | '$laufend' | '$alle'], [tabelle]);
}

/**
 * Wert einer Sonderzeilen-Zelle (Kopf-/Summenzeile, siehe `SonderZeile`) für EINE Spalte -- die
 * x-Position kommt beim Zeichnen von der Spalte selbst (siehe `build.ts`), hier nur der Zellinhalt.
 * `rows` kommt einmal pro Sonderzeile über `zeilenFuerUeber()`, nicht neu pro Zelle.
 */
export function sonderZeileZelleWert(zelle: SonderZeileZelle, spalte: Spalte, tabelleName: string, rows: Zeile[], daten: Daten, kontext: Kontext): string {
  const format = zelle.format ?? spalte.format;
  const formatiere = (roh: unknown): string => (format ? FORMAT[format](roh) : standardText(roh));

  if (zelle.art === 'kopf') {
    // Ohne dynamischen Platz ist die Spalte selbst schon eindeutig -- ihr Label ist die Überschrift.
    if (!spalte.listenPlatz) return spalte.label ?? '';
    const aufloesung = kontext.listen[tabelleName];
    const schluessel = schluesselAufPlatz(aufloesung, spalte.listenPlatz.gruppe, spalte.listenPlatz.index);
    const gruppe = aufloesung?.gruppen[spalte.listenPlatz.gruppe];
    return schluessel === undefined || !gruppe ? '' : listenBeschriftung(gruppe, schluessel);
  }

  if (!spalte.listenPlatz) {
    // Ankreuz-Spalte (bedingter Zellinhalt): ihr Wert entsteht erst je Zeile aus der Bedingung
    // (siehe spaltenWert.ts), es gibt kein flaches Zeilenfeld zum Summieren -- "Summe" zählt deshalb,
    // wie viele Zeilen die Bedingung erfüllen.
    if (spalte.wenn) return formatiere(rows.filter(z => trifftBedingung(spalte.wenn!, z)).length);
    // Normale Spalte ohne dynamischen Platz: reguläre Summe über diese Tabelle -- nutzbar auch ohne
    // Zulagen-Bezug (EA/EWT/Bereitschaft-Fußsummen brauchen weder bereinigt noch summeGeld).
    return formatiere(OPS.summe(rows, spalte.key));
  }

  const aufloesung = kontext.listen[tabelleName];
  const gruppe = aufloesung?.gruppen[spalte.listenPlatz.gruppe];
  const code = schluesselAufPlatz(aufloesung, spalte.listenPlatz.gruppe, spalte.listenPlatz.index);
  // Unbelegter Platz (dieser Monat kommt der Code nicht vor): 0 statt einer leeren Zelle -- eine
  // Summenzeile soll immer eine Zahl zeigen, nicht wie eine kaputte Konfiguration aussehen.
  if (!gruppe || code === undefined) return formatiere(0);
  const summe = summeUeberListe(rows, { quelle: gruppe.quelle, schluessel: gruppe.schluessel, wert: gruppe.wert, code });

  if (zelle.art === 'summe') return formatiere(summe);
  if (zelle.art === 'bereinigt') {
    const std = bereinigteZulagenStunden(code, summe);
    return std === undefined ? '-' : formatiere(std);
  }
  // summeGeld
  const geld = geldwertZulagenCode(code, summe, (get(daten, 'VorgabenGeld') as IVorgabeValue | undefined) ?? {});
  return formatiere(geld);
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
  return (w.werte ?? []).includes(roh as string | number | boolean);
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
