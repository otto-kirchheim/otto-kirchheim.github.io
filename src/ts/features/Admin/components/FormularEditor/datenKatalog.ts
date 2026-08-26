import { ZULAGEN_CATALOG, ZULAGEN_CATEGORY_MAX_SELECTIONS, ZulageCategory } from '@otto-kirchheim/nebengeld-shared';
import type { FormatName, ListenGruppe } from '@otto-kirchheim/nebengeld-shared';

export type FormularCode = 'ez' | 'ewt' | 'bereitschaft' | 'ea';

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
 * Ein realistischer Beispielwert für die Vorschau — als Konstante oder, wo eine Datenzeile sinnvoll
 * variieren muss (Tage, Auftragsnummern), als Funktion über den Zeilenindex.
 */
export type BeispielWert = string | number | string[] | ((index: number) => string | number);

export interface KatalogEintrag {
  /** Datenpfad wie ihn `get()` im Renderer auflöst */
  pfad: string;
  label: string;
  gruppe: string;
  /** Vorschlag fürs Feld-`format`, wird beim Anlegen/Umbenennen im Editor vorbelegt (nur wenn das
   * Feld noch kein eigenes `format` hat -- eine bewusste Wahl wird nie überschrieben). */
  format?: FormatName;
  /**
   * Beschränkt den Eintrag auf EINE Zeilenquelle (Wert aus `ZEILEN_QUELLEN[formular][].pfad`, z.B.
   * `'Daten.BZ'`). Nötig, wenn ein Formular mehrere Zeilenquellen hat und ein Feldname (z.B.
   * `Beginn`) dort je Quelle etwas anderes bedeutet. Ohne Angabe gilt der Eintrag für alle Quellen.
   */
  quelle?: string;
  /** Wert für die Beispieldaten-Vorschau; ohne Angabe greift der generische Platzhalter. */
  beispiel?: BeispielWert;
  /**
   * Beschränkt einen `BASIS`-Eintrag auf bestimmte Formulare (z.B. `Bereitschaftszulage.*` gibt es
   * nur im Bereitschaft-Download-Body). Fehlt das Feld, ist der Eintrag für alle Formulare
   * sichtbar -- die bisherige, unveränderte Bedeutung.
   */
  formulare?: FormularCode[];
}

/**
 * Datum als ISO-String, `index` Tage nach dem Monatsersten -- passt zu allen Datumsformaten.
 * Beginnt bewusst am 1., nicht am 2.: sonst fehlt in der Tages-Spalte der erste Tag des Monats,
 * was beim Prüfen der Vorschau wie ein verlorener Datensatz aussieht.
 */
function tag(index: number, ab = 1): string {
  return new Date(2026, 2, ab + index).toISOString();
}

/** Zeitstempel am selben Tagesraster, für Bereitschaftszeiträume und Uhrzeit-Spalten. */
function zeitpunkt(index: number, stunde: number, plusTage = 0): string {
  return new Date(2026, 2, 1 + index + plusTage, stunde).toISOString();
}

// Abgeleitet aus infrastructure/pdf/pdfDaten.ts -- die TS-Typen sind zur Laufzeit weg, deshalb hier als
// Datenstruktur gepflegt. Bei Änderungen an den IPdf*-Typen diesen Katalog mitziehen.

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
  // Bereitschaftszulage-Zwischenwerte (Phase 11, Nachtrag, siehe
  // infrastructure/pdf/abgeleiteteWerte.ts::bereitschaftszulageAbgeleiteteWerte) -- nur bei
  // Bereitschaft vorhanden (`formulare`-Filter unten), sonst würde der Eintrag bei ez/ewt/ea im
  // Datenpfad-Picker auftauchen und dort ins Leere laufen. Nur SummeBeamter3 ist ein Geldwert
  // (`waehrung`); alles andere sind Ganzzahlen (Minuten/Stunden/Sätze).
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

/** `BASIS`-Einträge, die für `formular` sichtbar sind (kein `formulare`-Filter, oder passt). */
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
    // Vorberechnet (Phase 12, siehe infrastructure/pdf/abgeleiteteWerte.ts::ezAbgeleiteteWerte) --
    // `Spalte` kann Beginn/Ende nicht wie `Feld.quellen` verketten, deshalb eigene Gruppe wie
    // DauerWohnung bei EWT.
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
    // Vorberechnet (Phase 10, siehe infrastructure/pdf/abgeleiteteWerte.ts::ewtAbgeleiteteWerte) --
    // eigene Gruppe, damit der Editor sie ohne Rechnung-Builder direkt als Spalten-/Ankreuz-Quelle
    // anbietet statt jede Version die Zeitrechnung selbst nachbauen zu lassen.
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
    // Bereitschaft hat ZWEI Zeilenquellen (BZ, BE, siehe ZEILEN_QUELLEN), keine gemeinsame: `Beginn`/
    // `Ende` heissen dort zwar gleich, bedeuten aber Verschiedenes und sind entsprechend GETRENNTE
    // Eintraege mit `quelle`. Im Zeitraum (BZ) steckt ein voller Zeitstempel dahinter (siehe
    // IBereitschaftszeitraum), im Einsatz (BE) eine reine `"HH:mm"`-Uhrzeit (IBereitschaftseinsatz).
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
    // Kurzer Anruf WÄHREND des Zeitraums, nicht dessen volle Spanne -- siehe
    // createAddModalBereitschaftsEinsatz.tsx ("Von"/"Bis" als knappes Zeitfenster für einen Einsatz).
    { pfad: 'Beginn', label: 'Beginn (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '01:15' },
    { pfad: 'Ende', label: 'Ende (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '02:00' },
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile BE', format: 'datum', quelle: 'Daten.BE', beispiel: i => tag(i) },
    {
      pfad: 'Auftragsnummer',
      label: 'Auftragsnummer',
      gruppe: 'Zeile BE',
      quelle: 'Daten.BE',
      beispiel: i => `B-200${11 + i}`,
    },
    { pfad: 'LRE', label: 'LRE', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: 'LRE 1' },
    { pfad: 'PrivatKm', label: 'Privat-km', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: i => 8 + i * 2 },
    // Vorberechnet (Phase 11, siehe infrastructure/pdf/abgeleiteteWerte.ts::bzAbgeleiteteWerte/
    // beAbgeleiteteWerte) -- eigene Gruppe je Quelle, damit der Editor sie ohne Rechnung-Builder
    // direkt als Spalten-/Summenquelle anbietet statt jede Version die Zeitrechnung selbst
    // nachbauen zu lassen (wie DauerWohnung/DauerErsteTkgSt bei EWT). Beide Eintraege heissen
    // `Dauer` (derselbe Pfad wie Beginn/Ende oben, getrennt ueber `quelle`) -- Labels MÜSSEN sich
    // unterscheiden ("Zeitraum" vs. "Einsatz", wie bei Beginn/Ende), sonst sind sie in einer
    // Feld-Auswahl ohne Tabellen-Kontext (z.B. Kopf-/Fuß-Summenfeld) nicht auseinanderzuhalten.
    // Bewusst Minuten (Zahl) statt HH:mm-Text wie bei EWT -- explizite User-Vorgabe.
    { pfad: 'Dauer', label: 'Dauer Zeitraum (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BZ', beispiel: 450 },
    { pfad: 'Dauer', label: 'Dauer Einsatz (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BE', beispiel: 45 },
    // Euro-Betrag für Privat-km, Satz aus VorgabenGeld (PrivatPKWTarif/PrivatPKWBeamter je nach
    // Pers.TB) -- gleiche Konvention wie calculateBerechnungRows.ts. `format` als Vorschlag, damit
    // eine neu angelegte Spalte/Feld sofort mit Währungsformat startet statt roher Zahl.
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
 * Zeilenlisten im Download-Body, aus denen eine Tabelle gespeist werden kann. Bereitschaft liefert
 * zwei (Zeiträume und Einsätze) — dieselbe Quelle darf mehrere Tabellen speisen, getrennt über den
 * Filter (z.B. Einsätze nach LRE).
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

/** Auswahl für Kopf-/Fuß-/Übertrags-Felder: alles außerhalb der Datentabelle. */
export function katalogFelder(formular: FormularCode): KatalogEintrag[] {
  return [
    ...basisFuer(formular),
    ...ZEILEN_QUELLEN[formular].map(q => ({ pfad: q.pfad, label: `${q.label} (ganze Liste)`, gruppe: 'Daten' })),
  ];
}

/**
 * Auswahl für Tabellenspalten und für das `feld` in Summenfeldern: Felder EINER Datenzeile. `quelle`
 * (Wert aus `ZEILEN_QUELLEN[formular][].pfad`, meist `tabelle.quelle`) grenzt auf EINE Zeilenquelle
 * ein -- wichtig bei Formularen mit mehreren Quellen (Bereitschaft: BZ/BE), sonst tauchen Felder der
 * jeweils anderen Tabelle mit an. Ohne Angabe kommen alle Einträge zurück (z.B. für Kontexte ohne
 * feste Tabelle).
 */
export function katalogZeilenFelder(formular: FormularCode, quelle?: string): KatalogEintrag[] {
  const eintraege = ZEILEN_FELDER[formular];
  return quelle === undefined ? eintraege : eintraege.filter(e => e.quelle === undefined || e.quelle === quelle);
}

/**
 * Bekannte Wertelisten je Zeilenfeld — dadurch lassen sich Tabellen-Filter und Ankreuz-Spalten
 * ankreuzen statt abtippen. Nur für Felder mit fester Auswahl; alles andere bleibt Freitext.
 */
const WERTE: Record<string, string[]> = {
  LRE: ['LRE 1', 'LRE 2', 'LRE 1/2 ohne x', 'LRE 3', 'LRE 3 ohne x'],
};

export function werteAuswahl(feld: string): string[] {
  return WERTE[feld] ?? [];
}

/**
 * Zeilenfelder mit echtem `boolean`-Wert (vorberechnete Ankreuz-Quellen, siehe
 * `infrastructure/pdf/abgeleiteteWerte.ts::ewtAbgeleiteteWerte`) -- der Editor bietet für diese
 * Felder in der Ankreuz-Bedingung eine Ja/Nein-Auswahl (`werte: [true]`/`[false]`) statt der
 * generischen Werte-Liste/Wertebereich-Wahl an.
 */
const BOOLEAN_FELDER = new Set([
  'Wohnung8bis14',
  'Wohnung14bis24',
  'WohnungUeber24',
  'BeamterUeber8Wohnung',
  'TkgSt8bis24',
  'TkgStUeber24',
]);

export function istBooleanFeld(feld: string): boolean {
  return BOOLEAN_FELDER.has(feld);
}

export function gruppiere(eintraege: KatalogEintrag[]): [string, KatalogEintrag[]][] {
  const map = new Map<string, KatalogEintrag[]>();
  for (const e of eintraege) map.set(e.gruppe, [...(map.get(e.gruppe) ?? []), e]);
  return [...map.entries()];
}

/**
 * Realistischer Beispielwert zu einem Datenpfad, für die Beispieldaten-Vorschau. `index` ist die
 * Zeilennummer (0 für Felder außerhalb der Tabelle), damit Tage und Auftragsnummern über die Zeilen
 * variieren statt sich zu wiederholen. `quelle` (meist `tabelle.quelle`) trifft die richtige Wahl,
 * wenn derselbe Pfad je Zeilenquelle etwas anderes bedeutet (Bereitschaft: `Beginn`/`Ende` in BZ vs.
 * BE). `undefined` heißt: kein Beispiel hinterlegt, es greift der generische Platzhalter.
 */
export function beispielWert(formular: FormularCode, pfad: string, index: number, quelle?: string): unknown {
  const eintrag = [...basisFuer(formular), ...katalogZeilenFelder(formular, quelle)].find(e => e.pfad === pfad);
  if (!eintrag?.beispiel) return undefined;
  return typeof eintrag.beispiel === 'function' ? eintrag.beispiel(index) : eintrag.beispiel;
}

/**
 * Fertige Listen-Gruppen je Formular. EZ ist der Fall, für den es sie gibt: die Zulagen einer Zeile
 * sind eine Liste, im Formular stehen dafür feste Spaltenplätze, und welcher Code über welcher
 * Spalte steht, hängt vom Monat ab. Die Codes und ihre Zahl je Kategorie kommen aus dem
 * gemeinsamen Zulagen-Katalog, damit hier keine zweite Liste gepflegt werden muss.
 */
export interface ListenVorlage {
  /** Vorschlag für den Gruppen-Key in `TabellenDef.listen` */
  name: string;
  label: string;
  /** Wie viele Spaltenplätze das Formular für diese Gruppe vorsieht */
  plaetze: number;
  gruppe: ListenGruppe;
}

function zulagenGruppe(kategorie: ZulageCategory): ListenGruppe {
  const codes = ZULAGEN_CATALOG.filter(z => z.category === kategorie).map(z => z.code);
  // Ohne `beschriftungen`: über der Spalte steht der Code selbst, wie auf dem gedruckten Zettel.
  return { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: [...codes] };
}

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

/** Kategorie zu einer Vorlage — nur EZ hat welche; für die Kurztext-Umschaltung im Editor. */
export const VORLAGEN_KATEGORIE: Record<string, ZulageCategory> = {
  erschwernis: ZulageCategory.Erschwerniszulage,
  leistung: ZulageCategory.LeistungspramieUndFahrentschaedigung,
  gkr: ZulageCategory.Ganzkoerperreinigung,
};
