export type FormularCode = 'ez' | 'ewt' | 'bereitschaft' | 'ea';

export interface KatalogEintrag {
  /** Datenpfad wie ihn `get()` im Renderer auflöst */
  pfad: string;
  label: string;
  gruppe: string;
  format?: 'waehrung' | 'datum';
}

// Abgeleitet aus shared/src/download.ts -- die TS-Typen sind zur Laufzeit weg, deshalb hier als
// Datenstruktur gepflegt. Bei Änderungen an den IDownload*-Typen diesen Katalog mitziehen.

const BASIS: KatalogEintrag[] = [
  { pfad: 'Jahr', label: 'Jahr', gruppe: 'Zeitraum' },
  { pfad: 'Monat', label: 'Monat', gruppe: 'Zeitraum' },
  { pfad: 'VorgabenU.Pers.Vorname', label: 'Vorname', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Nachname', label: 'Nachname', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Name', label: 'Name (zusammengesetzt)', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.PNummer', label: 'Personalnummer', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Telefon', label: 'Telefon', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Adress1', label: 'Adresse Zeile 1', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Adress2', label: 'Adresse Zeile 2', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Bundesland', label: 'Bundesland', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Taetigkeit', label: 'Tätigkeit (Grund)', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.Entgeltgruppe', label: 'Entgeltgruppe (Grund)', gruppe: 'Person' },
  { pfad: 'VorgabenU.Pers.ErsteTkgSt', label: 'Erste Tätigkeitsstätte', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.ErsteTkgStAdresse', label: 'Adresse erste Tätigkeitsstätte', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.Betrieb', label: 'Betrieb', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.OE', label: 'Organisationseinheit', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.Gewerk', label: 'Gewerk', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.TB', label: 'Tarif/Besoldung', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.kmArbeitsort', label: 'km zum Arbeitsort', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.nBhf', label: 'Nächster Bahnhof', gruppe: 'Dienststelle' },
  { pfad: 'VorgabenU.Pers.kmnBhf', label: 'km zum nächsten Bahnhof', gruppe: 'Dienststelle' },
];

/** Zeilen-Felder je Ressource -- als `zeilen.spalten[].key` bzw. als `feld` in Summenfeldern nutzbar. */
const ZEILEN_FELDER: Record<FormularCode, KatalogEintrag[]> = {
  ez: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum' },
    { pfad: 'Beginn', label: 'Beginn (HH:mm)', gruppe: 'Zeile' },
    { pfad: 'Ende', label: 'Ende (HH:mm)', gruppe: 'Zeile' },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer', gruppe: 'Zeile' },
    { pfad: 'Zulagen', label: 'Zulagen (Liste)', gruppe: 'Zeile' },
  ],
  ewt: [
    { pfad: 'Buchungstag', label: 'Buchungstag', gruppe: 'Zeile' },
    { pfad: 'Einsatzort', label: 'Einsatzort', gruppe: 'Zeile' },
    { pfad: 'Schicht', label: 'Schicht', gruppe: 'Zeile' },
    { pfad: 'abWE', label: 'Abfahrt Wohnung', gruppe: 'Zeile' },
    { pfad: 'ab1E', label: 'Abfahrt erste Tätigkeitsstätte', gruppe: 'Zeile' },
    { pfad: 'anEE', label: 'Ankunft Einsatzort', gruppe: 'Zeile' },
    { pfad: 'beginE', label: 'Arbeitsbeginn', gruppe: 'Zeile' },
    { pfad: 'endeE', label: 'Arbeitsende', gruppe: 'Zeile' },
    { pfad: 'abEE', label: 'Abfahrt Einsatzort', gruppe: 'Zeile' },
    { pfad: 'an1E', label: 'Ankunft erste Tätigkeitsstätte', gruppe: 'Zeile' },
    { pfad: 'anWE', label: 'Ankunft Wohnung', gruppe: 'Zeile' },
  ],
  bereitschaft: [
    // Beginn/Ende tragen in beiden Quellen denselben Schluessel, aber unterschiedliche Formate:
    // im Zeitraum (BZ) ein voller Zeitstempel, im Einsatz (BE) eine reine `"HH:mm"`-Uhrzeit.
    { pfad: 'Beginn', label: 'Beginn — BZ: Datum+Zeit, BE: Uhrzeit', gruppe: 'Zeile BZ/BE', format: 'datum' },
    { pfad: 'Ende', label: 'Ende — BZ: Datum+Zeit, BE: Uhrzeit', gruppe: 'Zeile BZ/BE', format: 'datum' },
    { pfad: 'Pause', label: 'Pause (Minuten)', gruppe: 'Zeile BZ' },
    { pfad: 'Tag', label: 'Tag (Einsatz)', gruppe: 'Zeile BE', format: 'datum' },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer (Einsatz)', gruppe: 'Zeile BE' },
    { pfad: 'LRE', label: 'LRE (Einsatz)', gruppe: 'Zeile BE' },
    { pfad: 'PrivatKm', label: 'Privat-km (Einsatz)', gruppe: 'Zeile BE' },
  ],
  ea: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum' },
    { pfad: 'Dauer', label: 'Dauer (HH:mm)', gruppe: 'Zeile' },
    { pfad: 'Taetigkeit', label: 'Tätigkeit (Tag)', gruppe: 'Zeile' },
    { pfad: 'Entgeltgruppe', label: 'Entgeltgruppe (Tag)', gruppe: 'Zeile' },
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
