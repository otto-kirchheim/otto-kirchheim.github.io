export type FormularCode = 'ez' | 'ewt' | 'bereitschaft' | 'ea';

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
  format?: 'waehrung' | 'datum';
  /** Wert für die Beispieldaten-Vorschau; ohne Angabe greift der generische Platzhalter. */
  beispiel?: BeispielWert;
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

// Abgeleitet aus shared/src/download.ts -- die TS-Typen sind zur Laufzeit weg, deshalb hier als
// Datenstruktur gepflegt. Bei Änderungen an den IDownload*-Typen diesen Katalog mitziehen.

const BASIS: KatalogEintrag[] = [
  { pfad: 'Jahr', label: 'Jahr', gruppe: 'Zeitraum', beispiel: 2026 },
  { pfad: 'Monat', label: 'Monat', gruppe: 'Zeitraum', beispiel: 3 },
  { pfad: 'VorgabenU.Pers.Vorname', label: 'Vorname', gruppe: 'Person', beispiel: 'Max' },
  { pfad: 'VorgabenU.Pers.Nachname', label: 'Nachname', gruppe: 'Person', beispiel: 'Mustermann' },
  { pfad: 'VorgabenU.Pers.Name', label: 'Name (zusammengesetzt)', gruppe: 'Person', beispiel: 'Mustermann, Max' },
  { pfad: 'VorgabenU.Pers.PNummer', label: 'Personalnummer', gruppe: 'Person', beispiel: '30012345' },
  { pfad: 'VorgabenU.Pers.Telefon', label: 'Telefon', gruppe: 'Person', beispiel: '0170 1234567' },
  { pfad: 'VorgabenU.Pers.Adress1', label: 'Adresse Zeile 1', gruppe: 'Person', beispiel: 'Bahnhofstraße 12' },
  { pfad: 'VorgabenU.Pers.Adress2', label: 'Adresse Zeile 2', gruppe: 'Person', beispiel: '12345 Musterstadt' },
  { pfad: 'VorgabenU.Pers.Bundesland', label: 'Bundesland', gruppe: 'Person', beispiel: 'Bayern' },
  { pfad: 'VorgabenU.Pers.Taetigkeit', label: 'Tätigkeit (Grund)', gruppe: 'Person', beispiel: 'Elektroniker/in' },
  { pfad: 'VorgabenU.Pers.Entgeltgruppe', label: 'Entgeltgruppe (Grund)', gruppe: 'Person', beispiel: 'EG 7' },
  { pfad: 'VorgabenU.Pers.ErsteTkgSt', label: 'Erste Tätigkeitsstätte', gruppe: 'Dienststelle', beispiel: 'Bw Musterstadt' },
  { pfad: 'VorgabenU.Pers.ErsteTkgStAdresse', label: 'Adresse erste Tätigkeitsstätte', gruppe: 'Dienststelle', beispiel: 'Werkstraße 3, 12345 Musterstadt' },
  { pfad: 'VorgabenU.Pers.Betrieb', label: 'Betrieb', gruppe: 'Dienststelle', beispiel: 'Instandhaltung Süd' },
  { pfad: 'VorgabenU.Pers.OE', label: 'Organisationseinheit', gruppe: 'Dienststelle', beispiel: ['I', 'IW', 'MI'] },
  { pfad: 'VorgabenU.Pers.Gewerk', label: 'Gewerk', gruppe: 'Dienststelle', beispiel: 'Fahrzeuginstandhaltung' },
  { pfad: 'VorgabenU.Pers.TB', label: 'Tarif/Besoldung', gruppe: 'Dienststelle', beispiel: 'Tarifkraft' },
  { pfad: 'VorgabenU.Pers.kmArbeitsort', label: 'km zum Arbeitsort', gruppe: 'Dienststelle', beispiel: 23 },
  { pfad: 'VorgabenU.Pers.nBhf', label: 'Nächster Bahnhof', gruppe: 'Dienststelle', beispiel: 'Musterstadt Hbf' },
  { pfad: 'VorgabenU.Pers.kmnBhf', label: 'km zum nächsten Bahnhof', gruppe: 'Dienststelle', beispiel: 4 },
];

/** Zeilen-Felder je Ressource -- als `zeilen.spalten[].key` bzw. als `feld` in Summenfeldern nutzbar. */
const ZEILEN_FELDER: Record<FormularCode, KatalogEintrag[]> = {
  ez: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Beginn', label: 'Beginn (HH:mm)', gruppe: 'Zeile', beispiel: '06:00' },
    { pfad: 'Ende', label: 'Ende (HH:mm)', gruppe: 'Zeile', beispiel: '14:30' },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer', gruppe: 'Zeile', beispiel: i => `A-100${23 + i}` },
    { pfad: 'Zulagen', label: 'Zulagen (Liste)', gruppe: 'Zeile', beispiel: ['NZ', 'SoZ'] },
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
  ],
  bereitschaft: [
    // Beginn/Ende tragen in beiden Quellen denselben Schluessel -- ein Eintrag genuegt. Im Zeitraum
    // (BZ) steckt ein voller Zeitstempel dahinter, im Einsatz (BE) eine reine `"HH:mm"`-Uhrzeit.
    // Datum und Uhrzeit stehen im Formular in getrennten Zellen, sind aber KEIN getrenntes Feld:
    // dafuer dasselbe Feld zweimal als Spalte setzen, einmal Format „Datum kurz", einmal „Uhrzeit".
    // Zeitstempel statt reiner Uhrzeit: Format „Uhrzeit" liest daraus die Tageszeit, Format „Datum
    // kurz" das Datum -- ein Wert bedient damit BZ (Zeitraum) und BE (Einsatz) gleichermaßen.
    { pfad: 'Beginn', label: 'Beginn', gruppe: 'Zeile BZ + BE', format: 'datum', beispiel: i => zeitpunkt(i, 16) },
    { pfad: 'Ende', label: 'Ende', gruppe: 'Zeile BZ + BE', format: 'datum', beispiel: i => zeitpunkt(i, 6, 2) },
    { pfad: 'Pause', label: 'Pause (Minuten)', gruppe: 'Zeile BZ', beispiel: 30 },
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile BE', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer', gruppe: 'Zeile BE', beispiel: i => `B-200${11 + i}` },
    { pfad: 'LRE', label: 'LRE', gruppe: 'Zeile BE', beispiel: 'LRE 1' },
    { pfad: 'PrivatKm', label: 'Privat-km', gruppe: 'Zeile BE', beispiel: i => 8 + i * 2 },
  ],
  ea: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Dauer', label: 'Dauer (HH:mm)', gruppe: 'Zeile', beispiel: '02:30' },
    { pfad: 'Taetigkeit', label: 'Tätigkeit (Tag)', gruppe: 'Zeile', beispiel: 'Lokrangierführer/in' },
    { pfad: 'Entgeltgruppe', label: 'Entgeltgruppe (Tag)', gruppe: 'Zeile', beispiel: 'EG 8' },
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
    ...BASIS,
    ...ZEILEN_QUELLEN[formular].map(q => ({ pfad: q.pfad, label: `${q.label} (ganze Liste)`, gruppe: 'Daten' })),
  ];
}

/** Auswahl für Tabellenspalten und für das `feld` in Summenfeldern: Felder EINER Datenzeile. */
export function katalogZeilenFelder(formular: FormularCode): KatalogEintrag[] {
  return ZEILEN_FELDER[formular];
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

export function gruppiere(eintraege: KatalogEintrag[]): [string, KatalogEintrag[]][] {
  const map = new Map<string, KatalogEintrag[]>();
  for (const e of eintraege) map.set(e.gruppe, [...(map.get(e.gruppe) ?? []), e]);
  return [...map.entries()];
}

/**
 * Realistischer Beispielwert zu einem Datenpfad, für die Beispieldaten-Vorschau. `index` ist die
 * Zeilennummer (0 für Felder außerhalb der Tabelle), damit Tage und Auftragsnummern über die Zeilen
 * variieren statt sich zu wiederholen. `undefined` heißt: kein Beispiel hinterlegt, es greift der
 * generische Platzhalter.
 */
export function beispielWert(formular: FormularCode, pfad: string, index: number): unknown {
  const eintrag = [...BASIS, ...ZEILEN_FELDER[formular]].find(e => e.pfad === pfad);
  if (!eintrag?.beispiel) return undefined;
  return typeof eintrag.beispiel === 'function' ? eintrag.beispiel(index) : eintrag.beispiel;
}
