import type { ReactNode } from 'react';
import type { IVorgabenBerechnungMonat } from './IVorgabenBerechnungMonat.js';
import type { IVorgabenGeldType } from './IVorgabenGeldType.js';
import type { IVorgabenU } from './IVorgabenU.js';

export type TarifKraft = IVorgabenU['Pers']['TB'];

/** Ergebnis eines Monats in der Berechnungstabelle; `null` = keine Anzeige (leere Zelle). Die Felder tragen die Features bei. */
export interface IBerechnungMonatsErgebnis {
  monat: number;
  bereitschaftMinuten: number | null;
  bereitschaftAnzeige: string | null;
  bereitschaftszulage: number | null;
  lre1: number | null;
  lre2: number | null;
  lre3: number | null;
  privatPkw: number | null;
  summeBereitschaft: number | null;
  abwesenheiten: { a8: number | null; a14: number | null; a24: number | null } | null;
  steuerfreieAbwesenheiten: { s8: number | null; s14: number | null } | null;
  summeEwt: number | null;
  summeNebenbezuege: number | null;
  /** Reine Stunden-Anzeige (Minuten), kein Geldwert — fließt bewusst nicht in summeGesamt ein. */
  eaMinuten: number | null;
  summeGesamt: number | null;
}

/** Beitrag eines Features zum Monatsergebnis (Ausgabe von `calc`). */
export interface IBerechnungBeitrag {
  /** Felder, die das Feature im Monatsergebnis setzt. */
  ergebnis: Partial<IBerechnungMonatsErgebnis>;
  /** Zwischensumme in Euro; `undefined` = keine (zaehlt dann als 0 in der Gesamtsumme). */
  summe?: number;
  /** Ob `summe` in `summeGesamt` einfliesst (Entgeltausgleich ist nur eine Stunden-Anzeige). */
  zaehltInGesamtsumme: boolean;
}

/** Zeile der Desktop-Tabelle innerhalb der Gruppe eines Features. */
export interface IBerechnungTabellenZeile {
  id: string;
  /** `undefined` = keine eigene Kopfzelle (Fortsetzungszeile unter einem `rowSpan`). */
  label: ReactNode | undefined;
  rowSpan?: number;
  inhalt: (ergebnis: IBerechnungMonatsErgebnis) => ReactNode;
}

/**
 * Berechnungs-Slot eines Features (Teil `berechnung`): Aggregation, Formeln und Darstellung seiner Gruppe. Die
 * Reihenfolge der Beitraege folgt `meta.order` der Features; `Berechnung` selbst kennt kein Feature.
 * `extra` ist ein optionales Hilfsobjekt aus `vorbereite()` (z. B. Zulagen-Aufschluesselung), das an Tabelle und Karte durchgereicht wird.
 */
export interface IFeatureBerechnung {
  /** Schluessel des Buckets in `datenBerechnung` (persistiert, unveraendert). */
  bucketKey: keyof IVorgabenBerechnungMonat;
  /** Aggregiert die Zeilen des Features fuer einen Monat (`rows` je Ressource, alle Monate, bereits normalisiert). */
  aggregate(rows: Readonly<Record<string, unknown[] | undefined>>, monat: number): unknown;
  /** Formeln eines Monats aus dem (evtl. fehlenden, aelterer Snapshot) Bucket. */
  calc(
    bucket: unknown,
    kontext: { tarifKraft: TarifKraft; geld: IVorgabenGeldType; monat: number },
  ): IBerechnungBeitrag;
  /** Ob das Monatsergebnis anzeigbare Werte dieser Gruppe enthaelt. */
  hatDaten(ergebnis: IBerechnungMonatsErgebnis): boolean;
  /** Hilfsdaten fuer Darstellung und Zusatz-Sichtbarkeit; wird einmal je Rendern aufgerufen. */
  vorbereite?(): unknown;
  /** Weitere Daten ausserhalb des Ergebnisses (z. B. Roh-Zulagen): im Jahr (`monat` fehlt) oder in einem Monat. */
  hatZusatzDaten?(extra: unknown, monat?: number): boolean;
  /** Zeilen der Desktop-Tabelle in Darstellungsreihenfolge. */
  tabelle(extra: unknown): IBerechnungTabellenZeile[];
  /** Inhalt der Gruppe in der mobilen Monatskarte; `null` = nichts anzeigen. */
  karte(ergebnis: IBerechnungMonatsErgebnis, extra: unknown): ReactNode;
}
