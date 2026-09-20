import {
  LreType,
  ZULAGEN_CATALOG,
  ZULAGEN_CATEGORY_MAX_SELECTIONS,
  ZulageCategory,
} from '@otto-kirchheim/nebengeld-shared';
import type { FormatName, ListenGruppe, Schriftfamilie } from '@otto-kirchheim/nebengeld-shared';

export type FormularCode = 'ez' | 'ewt' | 'bereitschaft' | 'ea';

/**
 * Wählbare Schriftfamilien für `Layout.schriftart`. `helvetica`/`times`/`courier` sind die Standard-14
 * (nicht eingebettet); `db-sans`/`db-head` (`@db-ux/db-theme-fonts`) bettet `build.ts` per fontkit ein.
 * Eingebettete Vorlagen-Familien (`vorlage:*`) hängt der Editor zur Laufzeit an (`vorlageFonts.ts`,
 * `SchriftartWahl.tsx`).
 */
export const SCHRIFTARTEN: { wert: Schriftfamilie; label: string }[] = [
  { wert: 'helvetica', label: 'Helvetica (Standard)' },
  { wert: 'times', label: 'Times' },
  { wert: 'courier', label: 'Courier' },
  { wert: 'db-sans', label: 'DB Neo Screen Sans' },
  { wert: 'db-head', label: 'DB Neo Screen Head' },
];

/** Format-Auswahl für Feld/Spalte/Sonderzeilen-Zelle -- `''` steht für "kein eigenes Format". */
export const FORMATE: { wert: FormatName | ''; label: string }[] = [
  { wert: '', label: 'unverändert' },
  { wert: 'waehrung', label: 'Währung (1.234,50)' },
  { wert: 'zahl', label: 'Zahl (1.234,57)' },
  { wert: 'ganzzahl', label: 'Ganzzahl (1.235)' },
  { wert: 'datum', label: 'Datum (15.03.2026)' },
  { wert: 'datumKurz', label: 'Datum kurz (15.03.)' },
  { wert: 'tag', label: 'Tag (15)' },
  { wert: 'tagZweistellig', label: 'Tag zweistellig (05)' },
  { wert: 'wochentag', label: 'Wochentag (So)' },
  { wert: 'monatJahr', label: 'Monat/Jahr (03/2026)' },
  { wert: 'monatName', label: 'Monatsname (März)' },
  { wert: 'monatNameKurz', label: 'Monatsname kurz (Mär)' },
  { wert: 'uhrzeit', label: 'Uhrzeit (07:05)' },
  { wert: 'stunden', label: 'Zeitspanne (2:30)' },
  { wert: 'liste', label: 'Liste zusammenfügen (I / IW)' },
  { wert: 'grossbuchstaben', label: 'GROSSBUCHSTABEN' },
  { wert: 'jaNein', label: 'Ja/Nein' },
  { wert: 'oe', label: 'Organisationseinheit (V.IW-MI-N-KSL-IL 03)' },
];

/**
 * Beispielwert für die Vorschau: Konstante oder, wo die Zeilen variieren müssen (Tage,
 * Auftragsnummern), Funktion über den Zeilenindex.
 */
export type BeispielWert = string | number | string[] | ((index: number) => string | number);

export interface KatalogEintrag {
  /** Datenpfad, wie ihn `get()` im Renderer auflöst */
  pfad: string;
  label: string;
  gruppe: string;
  /** Format-Vorschlag, beim Anlegen/Umbenennen vorbelegt (nur ohne eigenes `format`). */
  format?: FormatName;
  /**
   * Beschränkt den Eintrag auf EINE Zeilenquelle (`ZEILEN_QUELLEN[formular][].pfad`, z.B. `'Daten.BZ'`),
   * wenn ein Feldname (`Beginn`) je Quelle Verschiedenes bedeutet. Ohne Angabe für alle Quellen.
   */
  quelle?: string;
  /** Wert für die Beispieldaten-Vorschau; ohne Angabe greift der generische Platzhalter. */
  beispiel?: BeispielWert;
  /**
   * Beschränkt einen `BASIS`-Eintrag auf bestimmte Formulare (`Bereitschaftszulage.*` gibt es nur im
   * Bereitschaft-Body). Ohne Angabe für alle.
   */
  formulare?: FormularCode[];
}

/**
 * Datum als ISO-String, `index` Tage nach dem Monatsersten. Beginnt am 1., sonst fehlt in der
 * Tages-Spalte der erste Tag und die Vorschau wirkt, als fehle ein Datensatz.
 *
 * @param index - Tage nach dem Start.
 * @param ab - Starttag im März 2026 (Default: der 1.).
 * @returns ISO-Zeitstempel.
 */
function tag(index: number, ab = 1): string {
  return new Date(2026, 2, ab + index).toISOString();
}

/**
 * Zeitstempel am selben Tagesraster (Bereitschaftszeiträume, Uhrzeit-Spalten).
 *
 * @param index - Tage nach dem Monatsersten.
 * @param stunde - Uhrzeit (volle Stunde).
 * @param plusTage - Zusätzliche Tage, z.B. für ein Zeitraum-Ende.
 * @returns ISO-Zeitstempel.
 */
function zeitpunkt(index: number, stunde: number, plusTage = 0): string {
  return new Date(2026, 2, 1 + index + plusTage, stunde).toISOString();
}

// Abgeleitet aus `infrastructure/pdf/pdfDaten.ts`: die TS-Typen sind zur Laufzeit weg, daher von Hand
// gepflegt -- bei Änderungen an den `IPdf*`-Typen mitziehen.

const BASIS: KatalogEintrag[] = [
  { pfad: 'Jahr', label: 'Jahr', gruppe: 'Zeitraum', beispiel: 2026 },
  { pfad: 'Monat', label: 'Monat', gruppe: 'Zeitraum', beispiel: 3 },
  { pfad: 'VorgabenU.Pers.Vorname', label: 'Vorname', gruppe: 'Person', beispiel: 'Max' },
  { pfad: 'VorgabenU.Pers.Nachname', label: 'Nachname', gruppe: 'Person', beispiel: 'Mustermann' },
  { pfad: 'VorgabenU.Pers.Name', label: 'Name (zusammengesetzt)', gruppe: 'Person', beispiel: 'Mustermann, Max' },
  { pfad: 'VorgabenU.Pers.PNummer', label: 'Personalnummer', gruppe: 'Person', beispiel: '01234567' },
  { pfad: 'VorgabenU.Pers.Telefon', label: 'Telefon', gruppe: 'Person', beispiel: '0170 1234567' },
  {
    pfad: 'VorgabenU.Pers.Adress1',
    label: 'Adresse 1',
    gruppe: 'Person',
    beispiel: 'Bahnhofstraße 12, 12345 Musterstadt',
  },
  {
    pfad: 'VorgabenU.Pers.Adress2',
    label: 'Adresse 2',
    gruppe: 'Person',
    beispiel: 'Haltestelle 20, 12345 Musterstadt',
  },
  { pfad: 'VorgabenU.Pers.Bundesland', label: 'Bundesland', gruppe: 'Person', beispiel: 'Hessen' },
  { pfad: 'VorgabenU.Pers.Taetigkeit', label: 'Tätigkeit (Grund)', gruppe: 'Person', beispiel: 'Signalmechaniker' },
  { pfad: 'VorgabenU.Pers.Entgeltgruppe', label: 'Entgeltgruppe (Grund)', gruppe: 'Person', beispiel: '105' },
  {
    pfad: 'VorgabenU.Pers.ErsteTkgSt',
    label: 'Erste Tätigkeitsstätte',
    gruppe: 'Dienststelle',
    beispiel: 'Musterstadt',
  },
  {
    pfad: 'VorgabenU.Pers.ErsteTkgStAdresse',
    label: 'Adresse erste Tätigkeitsstätte',
    gruppe: 'Dienststelle',
    beispiel: 'Werkstraße 3, 12345 Musterstadt',
  },
  { pfad: 'VorgabenU.Pers.Betrieb', label: 'Betrieb', gruppe: 'Dienststelle', beispiel: 'DB InfraGO AG' },
  {
    pfad: 'VorgabenU.Pers.OE',
    label: 'Organisationseinheit',
    gruppe: 'Dienststelle',
    format: 'oe',
    beispiel: ['I', 'IW', 'MI', 'N', 'MUS', 'IL'],
  },
  { pfad: 'VorgabenU.Pers.Gewerk', label: 'Gewerk', gruppe: 'Dienststelle', beispiel: 'LST' },
  { pfad: 'VorgabenU.Pers.TB', label: 'Tarif/Besoldung', gruppe: 'Dienststelle', beispiel: 'Tarifkraft' },
  { pfad: 'VorgabenU.Pers.kmArbeitsort', label: 'km zum Arbeitsort', gruppe: 'Dienststelle', beispiel: 23 },
  { pfad: 'VorgabenU.Pers.nBhf', label: 'Nächster Bahnhof', gruppe: 'Dienststelle', beispiel: 'Musterstadt Hbf' },
  { pfad: 'VorgabenU.Pers.kmnBhf', label: 'km zum nächsten Bahnhof', gruppe: 'Dienststelle', beispiel: 4 },
  // Bereitschaftszulage-Zwischenwerte (`bereitschaftszulageAbgeleiteteWerte`) -- nur bei Bereitschaft
  // (`formulare`-Filter), sonst liefen sie bei ez/ewt/ea im Picker ins Leere. Nur SummeBeamter3 ist ein
  // Geldwert (`waehrung`), der Rest Ganzzahlen (Minuten/Stunden/Sätze).
  {
    pfad: 'Bereitschaftszulage.TarifBeamter',
    label: 'Tarifkraft/Beamter',
    gruppe: 'Bereitschaftszulage',
    formulare: ['bereitschaft'],
    beispiel: 'Tarifkraft',
  },
  {
    pfad: 'Bereitschaftszulage.BereitschaftsMinuten',
    label: 'Bereitschaftszeit abzgl. Einsätze (Minuten)',
    gruppe: 'Bereitschaftszulage',
    format: 'ganzzahl',
    formulare: ['bereitschaft'],
    beispiel: 6000,
  },
  {
    pfad: 'Bereitschaftszulage.SummeTarif',
    label: 'Summe Tarif (Std.)',
    gruppe: 'Bereitschaftszulage',
    format: 'ganzzahl',
    formulare: ['bereitschaft'],
    beispiel: 100,
  },
  {
    pfad: 'Bereitschaftszulage.SummeBeamter1',
    label: 'Summe 1 Beamter (Minuten)',
    gruppe: 'Bereitschaftszulage',
    format: 'ganzzahl',
    formulare: ['bereitschaft'],
    beispiel: 5400,
  },
  {
    pfad: 'Bereitschaftszulage.SummeBeamter2',
    label: 'Summe 2 Beamter (Sätze)',
    gruppe: 'Bereitschaftszulage',
    format: 'ganzzahl',
    formulare: ['bereitschaft'],
    beispiel: 11,
  },
  {
    pfad: 'Bereitschaftszulage.SummeBeamter3',
    label: 'Summe 3 Beamter (€)',
    gruppe: 'Bereitschaftszulage',
    format: 'waehrung',
    formulare: ['bereitschaft'],
    beispiel: 180.07,
  },
  {
    pfad: 'Bereitschaftszulage.GeldwertBeamter',
    label: 'Geldwert Beamter (Besoldungsgruppe, €)',
    gruppe: 'Bereitschaftszulage',
    format: 'waehrung',
    formulare: ['bereitschaft'],
    beispiel: 16.37,
  },
];

/**
 * `BASIS`-Einträge, die für `formular` sichtbar sind.
 *
 * @param formular - Formularcode.
 * @returns Die für dieses Formular sichtbaren `BASIS`-Einträge.
 */
function basisFuer(formular: FormularCode): KatalogEintrag[] {
  return BASIS.filter(e => !e.formulare || e.formulare.includes(formular));
}

/** Zeilen-Felder je Ressource -- als `zeilen.spalten[].key` bzw. als `feld` in Summenfeldern nutzbar. */
const ZEILEN_FELDER: Record<FormularCode, KatalogEintrag[]> = {
  ez: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Beginn', label: 'Beginn (HH:mm)', gruppe: 'Zeile', beispiel: '07:00' },
    { pfad: 'Ende', label: 'Ende (HH:mm)', gruppe: 'Zeile', beispiel: '15:45' },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer', gruppe: 'Zeile', beispiel: i => `1234567${23 + i}` },
    { pfad: 'Zulagen', label: 'Zulagen (Liste)', gruppe: 'Zeile', format: 'liste', beispiel: ['NZ', 'SoZ'] },
    // Vorberechnet (`ezAbgeleiteteWerte`): `Spalte` kann Beginn/Ende nicht wie `Feld.quellen` verketten.
    { pfad: 'Arbeitszeit', label: 'Arbeitszeit (HH:mm-HH:mm)', gruppe: 'Berechnet', beispiel: '07:00-15:45' },
  ],
  ewt: [
    { pfad: 'Buchungstag', label: 'Buchungstag', gruppe: 'Zeile', beispiel: i => String(2 + i).padStart(2, '0') },
    { pfad: 'Einsatzort', label: 'Einsatzort', gruppe: 'Zeile', beispiel: 'Nürnberg Rbf' },
    { pfad: 'Schicht', label: 'Schicht', gruppe: 'Zeile', beispiel: 'F' },
    { pfad: 'abWE', label: 'Abfahrt Wohnung', gruppe: 'Zeile', beispiel: '05:15' },
    { pfad: 'ab1E', label: 'Abfahrt erste Tätigkeitsstätte', gruppe: 'Zeile', beispiel: '05:45' },
    { pfad: 'anEE', label: 'Ankunft Einsatzort', gruppe: 'Zeile', beispiel: '07:00' },
    { pfad: 'beginE', label: 'Arbeitsbeginn', gruppe: 'Zeile', beispiel: '07:15' },
    { pfad: 'endeE', label: 'Arbeitsende', gruppe: 'Zeile', beispiel: '15:45' },
    { pfad: 'abEE', label: 'Abfahrt Einsatzort', gruppe: 'Zeile', beispiel: '16:00' },
    { pfad: 'an1E', label: 'Ankunft erste Tätigkeitsstätte', gruppe: 'Zeile', beispiel: '17:15' },
    { pfad: 'anWE', label: 'Ankunft Wohnung', gruppe: 'Zeile', beispiel: '17:45' },
    // Vorberechnet (`ewtAbgeleiteteWerte`), eigene Gruppe: der Editor bietet sie ohne Rechnung-Builder als
    // Spalten-/Ankreuz-Quelle an.
    { pfad: 'DauerWohnung', label: 'Dauer Wohnung (HH:mm)', gruppe: 'Berechnet', beispiel: '12:30' },
    { pfad: 'DauerErsteTkgSt', label: 'Dauer erste Tätigkeitsstätte (HH:mm)', gruppe: 'Berechnet', beispiel: '11:30' },
    { pfad: 'Wohnung8bis14', label: 'Wohnung: 8-14h', gruppe: 'Berechnet', beispiel: 'true' },
    { pfad: 'Wohnung14bis24', label: 'Wohnung: 14-24h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'WohnungUeber24', label: 'Wohnung: über 24h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'BeamterUeber8Wohnung', label: 'Beamter, Wohnung über 8h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'TkgSt8bis24', label: 'Erste Tätigkeitsstätte: 8-24h', gruppe: 'Berechnet', beispiel: 'true' },
    { pfad: 'TkgStUeber24', label: 'Erste Tätigkeitsstätte: über 24h', gruppe: 'Berechnet', beispiel: 'false' },
  ],
  bereitschaft: [
    // Bereitschaft hat ZWEI Zeilenquellen (BZ, BE, siehe ZEILEN_QUELLEN). `Beginn`/`Ende` bedeuten dort
    // Verschiedenes, daher GETRENNTE Einträge mit `quelle`: im Zeitraum (BZ) ein voller Zeitstempel, im
    // Einsatz (BE) eine `"HH:mm"`-Uhrzeit.
    {
      pfad: 'Beginn',
      label: 'Beginn (Zeitraum)',
      gruppe: 'Zeile BZ',
      format: 'datum',
      quelle: 'Daten.BZ',
      beispiel: i => zeitpunkt(i, 15.75),
    },
    {
      pfad: 'Ende',
      label: 'Ende (Zeitraum)',
      gruppe: 'Zeile BZ',
      format: 'datum',
      quelle: 'Daten.BZ',
      beispiel: i => zeitpunkt(i, 7, 1),
    },
    { pfad: 'Pause', label: 'Pause (Minuten)', gruppe: 'Zeile BZ', quelle: 'Daten.BZ', beispiel: 30 },
    // Kurzer Anruf WÄHREND des Zeitraums, nicht dessen volle Spanne (`createAddModalBereitschaftsEinsatz.tsx`).
    { pfad: 'Beginn', label: 'Beginn (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '01:15' },
    { pfad: 'Ende', label: 'Ende (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '02:00' },
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile BE', format: 'datum', quelle: 'Daten.BE', beispiel: i => tag(i) },
    {
      pfad: 'Auftragsnummer',
      label: 'Auftragsnummer',
      gruppe: 'Zeile BE',
      quelle: 'Daten.BE',
      beispiel: i => `134567${111 + i}`,
    },
    {
      pfad: 'LRE',
      label: 'LRE',
      gruppe: 'Zeile BE',
      quelle: 'Daten.BE',
      beispiel: i => Object.values(LreType)[i % Object.values(LreType).length],
    },
    { pfad: 'PrivatKm', label: 'Privat-km', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: i => 8 + i * 2 },
    // Vorberechnet (`bzAbgeleiteteWerte`/`beAbgeleiteteWerte`), je Quelle eine eigene Gruppe. Beide heißen
    // `Dauer` (getrennt über `quelle`), die Labels MÜSSEN sich unterscheiden ("Zeitraum" vs. "Einsatz"),
    // sonst sind sie ohne Tabellen-Kontext (Kopf-/Fuß-Summenfeld) nicht auseinanderzuhalten. Minuten
    // (Zahl) statt HH:mm-Text wie bei EWT.
    { pfad: 'Dauer', label: 'Dauer Zeitraum (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BZ', beispiel: 450 },
    { pfad: 'Dauer', label: 'Dauer Einsatz (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BE', beispiel: 45 },
    // Euro-Betrag für Privat-km (Satz aus VorgabenGeld je nach Pers.TB, wie `calculateBerechnungRows.ts`);
    // `format` als Vorschlag, damit neue Spalten/Felder gleich mit Währungsformat starten.
    {
      pfad: 'PrivatKmBetrag',
      label: 'Privat-km Betrag (€)',
      gruppe: 'Berechnet',
      quelle: 'Daten.BE',
      format: 'waehrung',
      beispiel: 3.24,
    },
  ],
  ea: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Dauer', label: 'Dauer (HH:mm)', gruppe: 'Zeile', beispiel: '08:15' },
    { pfad: 'Taetigkeit', label: 'Tätigkeit (Tag)', gruppe: 'Zeile', beispiel: 'Teamleiter' },
    { pfad: 'Entgeltgruppe', label: 'Entgeltgruppe (Tag)', gruppe: 'Zeile', beispiel: '104' },
  ],
};

/**
 * Zeilenlisten im Download-Body, aus denen eine Tabelle gespeist wird. Bereitschaft liefert zwei
 * (Zeiträume, Einsätze); dieselbe Quelle darf mehrere Tabellen speisen, getrennt über den Filter.
 */
export const ZEILEN_QUELLEN: Record<FormularCode, { pfad: string; label: string }[]> = {
  ez: [{ pfad: 'Daten.N', label: 'Nebengeld-Einträge' }],
  ewt: [{ pfad: 'Daten.EWT', label: 'EWT-Buchungen' }],
  bereitschaft: [
    { pfad: 'Daten.BZ', label: 'Bereitschaftszeiträume' },
    { pfad: 'Daten.BE', label: 'Bereitschaftseinsätze' },
  ],
  ea: [{ pfad: 'Daten.EA', label: 'Entgeltausgleich-Einträge' }],
};

/**
 * Auswahl für Kopf-/Fuß-/Übertrags-Felder: alles außerhalb der Datentabelle.
 *
 * @param formular - Formularcode.
 * @returns Basisfelder plus je Zeilenquelle die ganze Liste.
 */
export function katalogFelder(formular: FormularCode): KatalogEintrag[] {
  return [
    ...basisFuer(formular),
    ...ZEILEN_QUELLEN[formular].map(q => ({ pfad: q.pfad, label: `${q.label} (ganze Liste)`, gruppe: 'Daten' })),
  ];
}

/**
 * Auswahl für Tabellenspalten und das `feld` in Summenfeldern: Felder EINER Datenzeile. `quelle` (meist
 * `tabelle.quelle`) grenzt auf eine Zeilenquelle ein -- sonst tauchen bei Bereitschaft (BZ/BE) Felder der
 * anderen Tabelle mit auf. Ohne Angabe alle Einträge.
 *
 * @param formular - Formularcode.
 * @param quelle - Zeilenquelle (`ZEILEN_QUELLEN[formular][].pfad`), ohne Angabe alle.
 * @returns Die passenden Zeilenfelder.
 */
export function katalogZeilenFelder(formular: FormularCode, quelle?: string): KatalogEintrag[] {
  const eintraege = ZEILEN_FELDER[formular];
  return quelle === undefined ? eintraege : eintraege.filter(e => e.quelle === undefined || e.quelle === quelle);
}

/**
 * Bekannte Wertelisten je Zeilenfeld (Tabellen-Filter und Ankreuz-Spalten zum Ankreuzen statt Tippen).
 * Nur Felder mit fester Auswahl.
 */
const WERTE: Record<string, string[]> = {
  LRE: Object.values(LreType),
};

/**
 * Auswählbare Werte eines Zeilenfeldes (siehe `WERTE`).
 *
 * @param feld - Zeilenfeld.
 * @returns Die auswählbaren Werte; leer für Freitext-Felder.
 */
export function werteAuswahl(feld: string): string[] {
  return WERTE[feld] ?? [];
}

/**
 * Zeilenfelder mit echtem `boolean` (vorberechnete Ankreuz-Quellen aus `ewtAbgeleiteteWerte`): die
 * Ankreuz-Bedingung bietet Ja/Nein (`werte: [true]`/`[false]`) statt Werte-Liste/Wertebereich.
 */
const BOOLEAN_FELDER = new Set([
  'Wohnung8bis14',
  'Wohnung14bis24',
  'WohnungUeber24',
  'BeamterUeber8Wohnung',
  'TkgSt8bis24',
  'TkgStUeber24',
]);

/**
 * Liefert das Feld einen echten `boolean` (siehe `BOOLEAN_FELDER`)?
 *
 * @param feld - Zeilenfeld.
 * @returns `true` für Felder mit echtem `boolean`-Wert.
 */
export function istBooleanFeld(feld: string): boolean {
  return BOOLEAN_FELDER.has(feld);
}

/**
 * Gruppiert Katalogeinträge nach `gruppe` (für die Auswahl-Anzeige).
 *
 * @param eintraege - Katalogeinträge.
 * @returns `[Gruppenname, Einträge]`-Paare in Reihenfolge des ersten Auftretens.
 */
export function gruppiere(eintraege: KatalogEintrag[]): [string, KatalogEintrag[]][] {
  const map = new Map<string, KatalogEintrag[]>();
  for (const e of eintraege) map.set(e.gruppe, [...(map.get(e.gruppe) ?? []), e]);
  return [...map.entries()];
}

/**
 * Beispielwert zu einem Datenpfad für die Vorschau. `index` ist die Zeilennummer (0 außerhalb der
 * Tabelle), damit Tage und Auftragsnummern variieren. `quelle` trifft die richtige Wahl, wenn derselbe
 * Pfad je Zeilenquelle Verschiedenes bedeutet. `undefined` = kein Beispiel, generischer Platzhalter.
 *
 * @param formular - Formularcode.
 * @param pfad - Datenpfad.
 * @param index - Zeilennummer (0 außerhalb der Tabelle).
 * @param quelle - Zeilenquelle bei mehrdeutigen Pfaden.
 * @returns Beispielwert, oder `undefined` ohne Katalogeintrag.
 */
export function beispielWert(formular: FormularCode, pfad: string, index: number, quelle?: string): unknown {
  const eintrag = [...basisFuer(formular), ...katalogZeilenFelder(formular, quelle)].find(e => e.pfad === pfad);
  if (!eintrag?.beispiel) return undefined;
  return typeof eintrag.beispiel === 'function' ? eintrag.beispiel(index) : eintrag.beispiel;
}

/**
 * Fertige Listen-Gruppen je Formular (nur EZ): die Zulagen einer Zeile sind eine Liste mit festen
 * Spaltenplätzen, welcher Code über welcher Spalte steht, hängt vom Monat ab. Codes und Zahl je
 * Kategorie kommen aus dem gemeinsamen Zulagen-Katalog.
 */
export interface ListenVorlage {
  /** Vorschlag für den Gruppen-Key in `TabellenDef.listen` */
  name: string;
  label: string;
  /** Spaltenplätze, die das Formular für diese Gruppe vorsieht */
  plaetze: number;
  gruppe: ListenGruppe;
}

/**
 * Baut die Listen-Gruppe `Zulagen` für eine Zulagen-Kategorie.
 *
 * @param kategorie - Zulagen-Kategorie.
 * @returns Listen-Gruppe mit allen Codes der Kategorie als Auswahl.
 */
function zulagenGruppe(kategorie: ZulageCategory): ListenGruppe {
  const codes = ZULAGEN_CATALOG.filter(z => z.category === kategorie).map(z => z.code);
  // Ohne `beschriftungen` steht der Code selbst über der Spalte, wie auf dem Zettel.
  return { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: [...codes] };
}

/**
 * Kurztexte der Zulagen-Codes einer Kategorie.
 *
 * @param kategorie - Zulagen-Kategorie.
 * @returns Kurztext je Zulagen-Code.
 */
export function zulagenKurztexte(kategorie: ZulageCategory): Record<string, string> {
  return Object.fromEntries(ZULAGEN_CATALOG.filter(z => z.category === kategorie).map(z => [z.code, z.shortLabel]));
}

const EZ_LISTEN: ListenVorlage[] = [
  {
    name: 'erschwernis',
    label: 'Erschwerniszulagen',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Erschwerniszulage],
    gruppe: zulagenGruppe(ZulageCategory.Erschwerniszulage),
  },
  {
    name: 'leistung',
    label: 'Leistungsprämie / Fahrentschädigung',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.LeistungspramieUndFahrentschaedigung],
    gruppe: zulagenGruppe(ZulageCategory.LeistungspramieUndFahrentschaedigung),
  },
  {
    name: 'gkr',
    label: 'Ganzkörperreinigung',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Ganzkoerperreinigung],
    gruppe: zulagenGruppe(ZulageCategory.Ganzkoerperreinigung),
  },
];

export const LISTEN_VORLAGEN: Record<FormularCode, ListenVorlage[]> = {
  ez: EZ_LISTEN,
  ewt: [],
  bereitschaft: [],
  ea: [],
};

/** Kategorie zu einer Vorlage (nur EZ), für die Kurztext-Umschaltung im Editor. */
export const VORLAGEN_KATEGORIE: Record<string, ZulageCategory> = {
  erschwernis: ZulageCategory.Erschwerniszulage,
  leistung: ZulageCategory.LeistungspramieUndFahrentschaedigung,
  gkr: ZulageCategory.Ganzkoerperreinigung,
};
