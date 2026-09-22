import type { FormatName, ListenGruppe, ZulageCategory } from '@otto-kirchheim/nebengeld-shared';

/**
 * Typen und Helfer des Formular-Editor-Katalogs, geteilt zwischen `datenKatalog.ts` (Basis, Zusammenfuehrung) und den
 * Katalog-Beitraegen je Feature (`features/Admin/features/<key>/katalog.ts`). Eigene Datei, damit die Feature-Beitraege
 * `datenKatalog.ts` nicht importieren muessen (sonst Zyklus: `datenKatalog.ts` importiert umgekehrt die Beitraege).
 */

export type FormularCode = 'ez' | 'ewt' | 'bereitschaft' | 'ea';

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
}

/**
 * Fertige Listen-Gruppe eines Formulars (bisher nur EZ): die Zulagen einer Zeile sind eine Liste mit festen
 * Spaltenplätzen, welcher Code über welcher Spalte steht, hängt vom Monat ab.
 */
export interface ListenVorlage {
  /** Vorschlag für den Gruppen-Key in `TabellenDef.listen` */
  name: string;
  label: string;
  /** Spaltenplätze, die das Formular für diese Gruppe vorsieht */
  plaetze: number;
  gruppe: ListenGruppe;
}

/** Katalog-Beitrag eines Formular-Features: Zeilenfelder/-quellen sowie optionale Basis- und Listen-Eintraege. */
export interface FeatureKatalog {
  /** Zusaetzliche `BASIS`-Eintraege, die nur fuer dieses Formular gelten (z. B. Bereitschaftszulage). */
  basisEintraege?: KatalogEintrag[];
  /** Felder je Datenzeile (Tabellenspalten, `feld` in Summenfeldern). */
  zeilenFelder: KatalogEintrag[];
  /** Zeilenlisten im Download-Body, aus denen eine Tabelle gespeist wird. */
  zeilenQuellen: { pfad: string; label: string }[];
  /** Fertige Listen-Gruppen (nur EZ). */
  listenVorlagen?: ListenVorlage[];
  /** Zulagen-Kategorie je Listen-Vorlage (nur EZ), fuer die Kurztext-Umschaltung im Editor. */
  vorlagenKategorie?: Record<string, ZulageCategory>;
}

/**
 * Datum als ISO-String, `index` Tage nach dem Monatsersten. Beginnt am 1., sonst fehlt in der
 * Tages-Spalte der erste Tag und die Vorschau wirkt, als fehle ein Datensatz.
 *
 * @param index - Tage nach dem Start.
 * @param ab - Starttag im März 2026 (Default: der 1.).
 * @returns ISO-Zeitstempel.
 */
export function tag(index: number, ab = 1): string {
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
export function zeitpunkt(index: number, stunde: number, plusTage = 0): string {
  return new Date(2026, 2, 1 + index + plusTage, stunde).toISOString();
}
