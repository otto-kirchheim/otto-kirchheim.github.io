import type {
  Bedingung,
  FormatName,
  OpName,
  Zeile,
  ZeilenBerechnet,
  ZeilenOpName,
} from '@otto-kirchheim/nebengeld-shared';
import dayjs from '@/shared/lib/date/configDayjs';

type Aggregator = (rows: Zeile[], feld?: string) => number;

/**
 * Zahlwert eines Zellinhalts. `"HH:mm"` wird als Minuten gelesen, alles andere über `Number` --
 * sonst wäre `Number("02:30")` NaN und jede Summe über eine Dauer-Spalte still 0.
 *
 * @param value - Zellinhalt (Zahl, `"HH:mm"`, String, leer).
 * @returns Zahlwert bzw. Minuten; `0` bei Unlesbarem.
 */
export function alsZahl(value: unknown): number {
  if (NUR_UHRZEIT.test(String(value ?? ''))) return alsMinuten(value);
  return Number(value) || 0;
}

/**
 * Summe der `wert`-Felder aller Listen-Einträge (z.B. EZ: `Zulagen`) über mehrere Zeilen, gefiltert auf
 * EINEN Schlüssel (`Berechnet.liste`). Zeilen ohne die Liste oder mit Nicht-Array tragen 0 bei.
 *
 * @param rows - Zeilen der Tabelle.
 * @param liste - Listenfeld (`quelle`), Code-Feld (`schluessel`), Wertfeld (`wert`) und der gesuchte `code`.
 * @returns Summe der `wert`-Felder aller Einträge mit diesem Code.
 */
export function summeUeberListe(
  rows: Zeile[],
  liste: { quelle: string; schluessel: string; wert: string; code: string },
): number {
  return rows.reduce((summe, zeile) => {
    const eintraege = zeile[liste.quelle];
    if (!Array.isArray(eintraege)) return summe;
    const treffer = eintraege.filter((e): e is Zeile => (e as Zeile)[liste.schluessel] === liste.code);
    return summe + treffer.reduce((s, e) => s + alsZahl(e[liste.wert]), 0);
  }, 0);
}

/**
 * Rohe Gesamtsumme ALLER Einträge einer Listen-Gruppe, unabhängig vom Code (Gegenstück zu
 * `summeUeberListe()`) -- `Berechnet.liste` ohne `index` bei `art: 'summe'`. Mischt Minuten und
 * Stückzahlen, falls die Gruppe beide enthält (Sache der Konfiguration).
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`) und Wertfeld (`wert`).
 * @returns Summe der `wert`-Felder aller Einträge.
 */
export function summeGruppe(rows: Zeile[], gruppe: { quelle: string; wert: string }): number {
  return rows.reduce((summe, zeile) => {
    const eintraege = zeile[gruppe.quelle];
    if (!Array.isArray(eintraege)) return summe;
    return summe + eintraege.reduce((s, e) => s + alsZahl((e as Zeile)[gruppe.wert]), 0);
  }, 0);
}

/**
 * Aggregationen über mehrere Zeilen (Kopf-/Fuß-Summen), je `OpName`.
 */
export const OPS: Record<OpName, Aggregator> = {
  /**
   * Summe eines Zeilenfeldes.
   *
   * @param rows - Zeilen der Tabelle.
   * @param feld - Zeilenfeld.
   * @returns Summe des Feldes (Dauern als Minuten).
   */
  summe: (rows, feld) => rows.reduce((s, r) => s + alsZahl(r[feld!]), 0),
  /**
   * Anzahl der Zeilen.
   *
   * @param rows - Zeilen der Tabelle.
   * @returns Anzahl der Zeilen.
   */
  anzahl: rows => rows.length,
  /**
   * Größter Wert eines Zeilenfeldes.
   *
   * @param rows - Zeilen der Tabelle.
   * @param feld - Zeilenfeld.
   * @returns Größter Wert, mindestens `0`.
   */
  max: (rows, feld) => Math.max(0, ...rows.map(r => alsZahl(r[feld!]))),
  /**
   * Jüngster Datumswert in `feld` als Zeitstempel in ms, `0` ohne lesbare Werte. Eine Zahl statt
   * Datums-String, damit jedes `FormatName`-Datumsformat greift; `max` taugt nicht (`Number("2026-03-15")`
   * ist `NaN`).
   *
   * @param rows - Zeilen der Tabelle.
   * @param feld - Datumsfeld.
   * @returns Zeitstempel in ms des jüngsten Datums, `0` ohne lesbare Werte.
   */
  letztesDatum: (rows, feld) => Math.max(0, ...rows.map(r => alsDatum(r[feld!])?.getTime() ?? 0)),
};

const TAG_MS = 24 * 60 * 60 * 1000;

/**
 * Wendet `Berechnet.maxTage` auf ein `letztesDatum` an: liegt der jüngste Eintrag höchstens `maxTage`
 * zurück, gilt er, sonst `heute`. Ohne `maxTage` bleibt es beim Eintrag. Ein Eintrag in der Zukunft
 * zählt als aktuell.
 *
 * @param letztes - Zeitstempel in ms aus `letztesDatum` (`0` = keiner).
 * @param maxTage - Frist in Tagen, `undefined` = keine.
 * @param heute - Erzeugungszeitpunkt (Rückfallwert).
 * @returns Zeitstempel in ms: `letztes` oder `heute`.
 */
export function datumMitFrist(letztes: number, maxTage: number | undefined, heute: Date): number {
  if (maxTage === undefined) return letztes;
  if (letztes === 0) return heute.getTime();
  return heute.getTime() - letztes <= maxTage * TAG_MS ? letztes : heute.getTime();
}

/**
 * Liest `"HH:mm"` oder einen ISO-Zeitstempel als Minuten seit Mitternacht (Basis für `zeitdifferenz`).
 *
 * @param value - `"HH:mm"`, ISO-Zeitstempel oder leer.
 * @returns Minuten seit Mitternacht; `0` bei Unlesbarem.
 */
export function alsMinuten(value: unknown): number {
  const treffer = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''));
  if (treffer) return Number(treffer[1]) * 60 + Number(treffer[2]);
  const d = dayjs((value ?? null) as string | null);
  return d.isValid() ? d.hour() * 60 + d.minute() : 0;
}

/**
 * Liest einen Zeitstempel als absolute Minuten (Basis für `zeitspanne`). Anders als `alsMinuten` bleibt
 * der Tag erhalten; reine `"HH:mm"`-Werte fallen auf `alsMinuten` zurück.
 *
 * @param value - Zeitstempel oder `"HH:mm"`.
 * @returns Absolute Minuten seit Epoche; `0` bei Unlesbarem.
 */
export function alsZeitstempelMinuten(value: unknown): number {
  if (NUR_UHRZEIT.test(String(value ?? ''))) return alsMinuten(value);
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? 0 : Math.round(d.getTime() / 60_000);
}

/** Erkennt nur ECHTE ISO-Zeitstempel (wie `toISOString()` sie liefert), keine Kalenderformate. */
const ISO_ZEITSTEMPEL = /^\d{4}-\d{2}-\d{2}/;

/**
 * Zahlwert für `Bedingung.bereich`-Vergleiche ohne Annahme über den Feldtyp: Zahl bleibt Zahl (anders
 * als `alsZeitstempelMinuten`), `"HH:mm"` wird zu Minuten, ISO- und deutsche Datumswerte zu Minuten seit
 * Epoche,
 * alles andere über `Number`. Zeilenwert und `von`/`bis` laufen durch dieselbe Funktion. Kein
 * `new Date()` auf jeden String: dessen Nicht-ISO-Fallback liest `"12.5"` als 5. Dezember.
 *
 * @param value - Zeilenwert oder Bereichsgrenze (`von`/`bis`).
 * @returns Vergleichbare Zahl; `0` bei Unlesbarem.
 */
export function alsVergleichswert(value: unknown): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '');
  if (NUR_UHRZEIT.test(s)) return alsMinuten(value);
  if (ISO_ZEITSTEMPEL.test(s) || DEUTSCHES_DATUM.test(s)) {
    const d = alsDatum(value);
    if (d) return Math.round(d.getTime() / 60_000);
  }
  return Number(value) || 0;
}

/**
 * Subtrahiert alle Operanden vom ersten.
 *
 * @param werte - Operanden; der erste ist der Minuend.
 * @returns `erster − alle folgenden`; `0` ohne Operanden.
 */
const differenz = (werte: number[]): number =>
  werte.length === 0 ? 0 : werte.slice(1).reduce((a, b) => a - b, werte[0]!);

/** Rechnet über die Operanden EINER Datenzeile (berechnete Spalten), nicht über mehrere Zeilen. */
export const ZEILEN_OPS: Record<ZeilenOpName, (werte: number[]) => number> = {
  /**
   * Produkt aller Operanden.
   *
   * @param werte - Operanden.
   * @returns Produkt; `1` ohne Operanden.
   */
  produkt: werte => werte.reduce((a, b) => a * b, 1),
  /**
   * Summe aller Operanden.
   *
   * @param werte - Operanden.
   * @returns Summe; `0` ohne Operanden.
   */
  summe: werte => werte.reduce((a, b) => a + b, 0),
  differenz,
  /**
   * Dividiert den ersten Operanden nacheinander durch alle folgenden.
   *
   * @param werte - Operanden; der erste ist der Dividend.
   * @returns `erster / alle folgenden`; ein Divisor `0` ergibt `0`, ohne Operanden `0`.
   */
  quotient: werte => (werte.length === 0 ? 0 : werte.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), werte[0]!)),
  /**
   * Operanden kommen bereits als Minuten an (siehe `alsMinuten`); über Mitternacht wird ergänzt.
   *
   * @param werte - Operanden in Minuten (`erster − folgende`).
   * @returns Differenz in Minuten, bei negativem Ergebnis um 24h ergänzt.
   */
  zeitdifferenz: werte => {
    const d = differenz(werte);
    return d < 0 ? d + 24 * 60 : d;
  },
  /** Zeitstempel-Differenz in Minuten, darf über Tage laufen — keine Mitternachts-Korrektur. */
  zeitspanne: differenz,
};

/**
 * Wandelt die Blatt-Operanden eines Operators in Zahlen — Zeit-Ops brauchen eigene Parser.
 *
 * @param op - Zeilen-Operator.
 * @returns Parser, der einen Blatt-Operanden in eine Zahl wandelt.
 */
function leseOperand(op: ZeilenOpName): (value: unknown) => number {
  if (op === 'zeitdifferenz') return alsMinuten;
  if (op === 'zeitspanne') return alsZeitstempelMinuten;
  // `alsZahl` statt `Number`, damit auch hier eine gespeicherte Dauer wie `"02:30"` mitrechnet.
  return alsZahl;
}

/**
 * Wertet eine Zeilenrechnung gegen EINE Datenzeile aus. Operanden dürfen selbst Rechnungen sein
 * (Ende − Beginn + Pause), ohne implizite Vorrangregel. Verschachtelte Knoten liefern Zahlen
 * (Zeit-Ops immer Minuten).
 *
 * @param b - Rechnung mit Operator und Operanden (Feldname, Zahl oder Unterrechnung).
 * @param zeile - Datenzeile, aus der die Feldnamen gelesen werden.
 * @returns Ergebnis; fehlende Feldwerte zählen als `0`.
 */
export function berechneZeile(b: ZeilenBerechnet, zeile: Zeile): number {
  const lies = leseOperand(b.op);
  const werte = b.operanden.map(operand => {
    if (typeof operand === 'number') return operand;
    if (typeof operand === 'string') return lies(zeile[operand]) || 0;
    return berechneZeile(operand, zeile);
  });
  return ZEILEN_OPS[b.op](werte);
}

/**
 * Prüft eine Ankreuz-Bedingung gegen eine Zeile. Geprüft wird `feld` oder `berechnet`; verglichen per
 * `werte` (Mitgliedschaft) oder `bereich` (`von` einschließlich, `bis` ausschließlich, gelesen über
 * `alsVergleichswert`).
 *
 * @param w - Bedingung (`feld` oder `berechnet`, dazu `werte` oder `bereich`).
 * @param zeile - Datenzeile.
 * @returns `true`, wenn die Zeile die Bedingung erfüllt.
 */
export function trifftBedingung(w: Bedingung, zeile: Zeile): boolean {
  const roh = w.berechnet ? berechneZeile(w.berechnet, zeile) : zeile[w.feld!];
  if (w.bereich) {
    const wert = alsVergleichswert(roh);
    return wert >= alsVergleichswert(w.bereich.von) && wert < alsVergleichswert(w.bereich.bis);
  }
  return (w.werte ?? []).includes(roh as string | number | boolean);
}

/**
 * Alle Zeilen-Feldnamen einer (ggf. verschachtelten) Rechnung — für Testdaten und Editor-Hinweise.
 *
 * @param b - Rechnung, ggf. verschachtelt.
 * @returns Alle Feldnamen der Operanden (Zahlen entfallen).
 */
export function operandenFelder(b: ZeilenBerechnet): string[] {
  return b.operanden.flatMap(operand => {
    if (typeof operand === 'string') return [operand];
    if (typeof operand === 'number') return [];
    return operandenFelder(operand);
  });
}

/** `"HH:mm"`-Strings kommen so aus den Download-Bodies und dürfen nicht durch `new Date()` laufen. */
const NUR_UHRZEIT = /^(\d{1,2}):(\d{2})/;

/**
 * `Tag`-Felder sind deutsches `"DD.MM.YYYY"` (Tabellen speichern Tage so). `new Date("14.08.2026")` ist
 * je nach Engine `Invalid Date` oder falsch.
 */
const DEUTSCHES_DATUM = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

/**
 * Liest einen Wert als Datum; deutsches `"DD.MM.YYYY"` wird gesondert geparst.
 *
 * @param value - Datum als `"DD.MM.YYYY"`, ISO-String, Zeitstempel (ms) oder leer.
 * @returns Das Datum, oder `null` bei Leerem/Ungültigem.
 */
function alsDatum(value: unknown): Date | null {
  // `new Date(null)` ergibt die Epoche statt Invalid Date -- Leerwerte vorher abfangen.
  if (value === null || value === undefined || value === '') return null;
  // Nur Strings aufs deutsche Format prüfen: `letztesDatum` reicht einen ms-Zeitstempel (Zahl) durch, und
  // `new Date("<Zahl als String>")` wäre `Invalid Date` (Parsing statt Epoche-Rechnung).
  if (typeof value === 'string') {
    const deutsch = DEUTSCHES_DATUM.exec(value);
    if (deutsch) {
      const [, tag, monat, jahr] = deutsch;
      const d = new Date(Number(jahr), Number(monat) - 1, Number(tag));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Füllt eine Zahl auf zwei Stellen auf.
 *
 * @param n - Ganze Zahl.
 * @returns `n` mit führender Null auf zwei Stellen.
 */
function zweistellig(n: number): string {
  return String(n).padStart(2, '0');
}

const MONATSNAMEN = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/**
 * Formatierer je `FormatName`: wandeln einen Rohwert in den Zellentext (`v` = Rohwert, Ergebnis = Text).
 */
export const FORMAT: Record<FormatName, (value: unknown) => string> = {
  /**
   * Betrag als Euro mit zwei Nachkommastellen.
   *
   * @param value - Betrag als Zahl.
   * @returns `1.234,50 €`.
   */
  waehrung: value =>
    `${Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  /**
   * Zahl mit deutschem Format.
   *
   * @param value - Zahl.
   * @returns Deutsch formatiert, höchstens zwei Nachkommastellen.
   */
  zahl: value => Number(value).toLocaleString('de-DE', { maximumFractionDigits: 2 }),
  /**
   * Auf ganze Zahl gerundet.
   *
   * @param value - Zahl.
   * @returns Auf ganze Zahl gerundet, deutsch formatiert.
   */
  ganzzahl: value => Math.round(Number(value) || 0).toLocaleString('de-DE'),

  /**
   * Datum als `TT.MM.JJJJ`.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns `TT.MM.JJJJ`; leer bei Unlesbarem.
   */
  datum: value => {
    const d = alsDatum(value);
    return d ? `${zweistellig(d.getDate())}.${zweistellig(d.getMonth() + 1)}.${d.getFullYear()}` : '';
  },
  /**
   * Datum als `TT.MM.`.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns `TT.MM.`; leer bei Unlesbarem.
   */
  datumKurz: value => {
    const d = alsDatum(value);
    return d ? `${zweistellig(d.getDate())}.${zweistellig(d.getMonth() + 1)}.` : '';
  },
  /**
   * Tag des Monats.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns Tag ohne führende Null; unlesbare Werte kommen unverändert durch.
   */
  tag: value => {
    const d = alsDatum(value);
    return d ? String(d.getDate()) : String(value ?? '');
  },
  /**
   * Tag mit führender Null (`05`). Unlesbare Werte kommen wie bei `tag` durch; ein leerer Wert bleibt
   * leer statt `00`.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns Zweistelliger Tag; unlesbare Werte kommen unverändert durch.
   */
  tagZweistellig: value => {
    const d = alsDatum(value);
    return d ? zweistellig(d.getDate()) : String(value ?? '');
  },
  /**
   * Wochentag als Kürzel.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns `So`-`Sa`; leer bei Unlesbarem.
   */
  wochentag: value => {
    const d = alsDatum(value);
    return d ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]! : '';
  },
  /**
   * Monat und Jahr.
   *
   * @param value - Datumswert (siehe `alsDatum`).
   * @returns `MM/JJJJ`; leer bei Unlesbarem.
   */
  monatJahr: value => {
    const d = alsDatum(value);
    return d ? `${zweistellig(d.getMonth() + 1)}/${d.getFullYear()}` : '';
  },
  /**
   * Monatsname für den `Monat`-Datenpfad (1-12 als Zahl, kein Datum). Nicht über `alsDatum`: `new Date(3)`
   * ergäbe ein Datum nahe der Epoche und damit "Januar" statt "März".
   *
   * @param value - Monat als Zahl 1-12.
   * @returns Monatsname; leer außerhalb 1-12.
   */
  monatName: value => MONATSNAMEN[Number(value) - 1] ?? '',
  /**
   * Wie `monatName`, auf die ersten drei Buchstaben gekürzt (`Mär` für März bleibt korrekt).
   *
   * @param value - Monat als Zahl 1-12.
   * @returns Erste drei Buchstaben des Monatsnamens.
   */
  monatNameKurz: value => MONATSNAMEN[Number(value) - 1]?.slice(0, 3) ?? '',

  /**
   * Uhrzeit als `HH:mm`.
   *
   * @param value - `"HH:mm"` oder Datumswert.
   * @returns `HH:mm`; leer bei Unlesbarem.
   */
  uhrzeit: value => {
    const treffer = NUR_UHRZEIT.exec(String(value ?? ''));
    if (treffer) return `${zweistellig(Number(treffer[1]))}:${treffer[2]}`;
    const d = alsDatum(value);
    return d ? `${zweistellig(d.getHours())}:${zweistellig(d.getMinutes())}` : '';
  },
  /**
   * Minuten-Zahl oder `"HH:mm"` als Zeitspanne `"H:mm"` (kann über 24h hinausgehen).
   *
   * @param value - Minuten oder `"HH:mm"`.
   * @returns `H:mm`.
   */
  stunden: value => {
    const treffer = NUR_UHRZEIT.exec(String(value ?? ''));
    const minuten = treffer ? Number(treffer[1]) * 60 + Number(treffer[2]) : Math.round(Number(value) || 0);
    return `${Math.floor(minuten / 60)}:${zweistellig(minuten % 60)}`;
  },

  /**
   * Arrays zu einer Zelle zusammenfügen (Trenner ` / `). Nicht für `Pers.OE` -- siehe `oe`.
   *
   * @param value - Array oder Einzelwert.
   * @returns Nichtleere Einträge, mit ` / ` verbunden.
   */
  liste: value =>
    Array.isArray(value)
      ? value.filter(t => t !== null && t !== undefined && t !== '').join(' / ')
      : String(value ?? ''),
  /**
   * Text in Großbuchstaben.
   *
   * @param value - Beliebiger Wert.
   * @returns Text in Großbuchstaben.
   */
  grossbuchstaben: value => String(value ?? '').toUpperCase(),
  /**
   * Boolean (echt oder als `"true"`/`"false"`-String) als deutsches Wort statt `true`/`false`.
   *
   * @param value - Boolean oder `"true"`/`"false"`.
   * @returns `Ja` oder `Nein`.
   */
  jaNein: value => (value === true || value === 'true' ? 'Ja' : 'Nein'),
  /**
   * Hierarchie-Ebenen einer OE (`Pers.OE`) kanonisch zusammenfügen: erste zwei Ebenen mit `.`, weitere
   * mit `-`, eine numerische letzte Ebene (Teamnummer) mit Leerzeichen, z.B. `V.IW-MI-N-KSL-IL 03`.
   * Spiegelt `joinOeSegments` (Backend) und `joinOeLevels` (`infrastructure/data/oeLevels.ts`), bewusst
   * dupliziert. `liste` würde die Schreibweise zerstören.
   *
   * @param value - Ebenen der OE (Array); Nicht-Arrays werden als Text durchgereicht.
   * @returns Kanonische Schreibweise, leer ohne Ebenen.
   */
  oe: value => {
    if (!Array.isArray(value)) return String(value ?? '');
    const segmente = value.map(teil => String(teil ?? '').trim()).filter(Boolean);
    if (segmente.length === 0) return '';
    if (segmente.length === 1) return segmente[0]!;

    const [ebene1, ebene2, ...rest] = segmente;
    const basis = `${ebene1}.${ebene2}`;
    if (rest.length === 0) return basis;

    const letzte = rest[rest.length - 1]!;
    const hatNumerischeTeamnummer = /^\d+$/.test(letzte) && rest.length >= 2;
    if (!hatNumerischeTeamnummer) return `${basis}-${rest.join('-')}`;

    const vorTeamnummer = rest.slice(0, -1).join('-');
    return `${basis}-${vorTeamnummer} ${letzte}`;
  },
};

/**
 * Stringifizierung für Werte ohne `format`. Nie roh `String()`: Arrays ergäben kommagetrennt ohne
 * Leerzeichen, Booleans englisches "true", Objekte (falscher Datenpfad) `"[object Object]"`.
 *
 * @param value - Beliebiger Wert.
 * @returns Anzeigetext; leer für `null`, `undefined` und Objekte.
 */
export function standardText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return FORMAT.liste(value);
  if (typeof value === 'boolean') return FORMAT.jaNein(value);
  if (typeof value === 'object') return '';
  return String(value);
}
