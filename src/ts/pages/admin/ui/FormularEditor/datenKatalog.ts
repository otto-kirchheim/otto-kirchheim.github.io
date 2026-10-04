import { DB_ASSETS } from '@/shared/lib/dbAssets';
import { ZULAGEN_CATALOG } from '@otto-kirchheim/nebengeld-shared';
import type { FormatName, Schriftfamilie, ZulageCategory } from '@otto-kirchheim/nebengeld-shared';
import type { FeatureKatalog, FormularCode, KatalogEintrag, ListenVorlage } from './katalogTypen';
import { getAdminFeaturesState } from '../../adminFeatures';

export type { BeispielWert, FormularCode, KatalogEintrag, ListenVorlage } from './katalogTypen';

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
  // Nur mit DB-Assets (`DB_ASSETS`); sonst faellt eine gespeicherte DB-Familie im PDF auf Helvetica zurueck.
  ...(DB_ASSETS
    ? [
        { wert: 'db-sans', label: 'DB Neo Screen Sans' },
        { wert: 'db-head', label: 'DB Neo Screen Head' },
      ]
    : []),
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

// Katalog-Beitrag je Formular-Feature; Felder/Quellen/Listen liegen bei den Features (`pages/admin/features/<key>/katalog.ts`,
// angemeldet ueber `AdminFeature.formular.katalog`), hier nur die Zusammenfuehrung. Abgeleitet aus `shared/lib/pdf/pdfDaten.ts`
// (Basis) und `features/<id>/model/pdfDaten.ts` (`IPdf*`-Typen je Ressource): die TS-Typen sind zur Laufzeit weg, daher von
// Hand gepflegt -- bei Änderungen an den `IPdf*`-Typen mitziehen.

/** Katalog ohne Felder (Formular eines nicht geladenen oder fehlenden Features). */
const LEERER_KATALOG: FeatureKatalog = { zeilenFelder: [], zeilenQuellen: [] };

/**
 * Katalogbeitraege der geladenen Admin-Anteile (`ladeAdminFeatures`), je Formular-Code.
 *
 * @returns Katalog je Formular-Code; leer, solange keine Admin-Anteile geladen sind.
 */
function featureKataloge(): Map<FormularCode, FeatureKatalog> {
  return new Map(
    getAdminFeaturesState().features.flatMap(feature =>
      feature.formular ? [[feature.formular.code, feature.formular.katalog] as const] : [],
    ),
  );
}

/**
 * Katalogbeitrag eines Formulars.
 *
 * @param formular - Formularcode.
 * @returns Beitrag des Features; ohne geladenes Feature ein leerer Katalog.
 */
function featureKatalog(formular: FormularCode): FeatureKatalog {
  return featureKataloge().get(formular) ?? LEERER_KATALOG;
}

/** Felder, die in jedem Formular vorkommen (Zeitraum, Person, Dienststelle); formularspezifische Basis-Felder liegen bei den Features. */
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
];

/**
 * `BASIS`-Einträge fuer `formular`, ergaenzt um dessen eigene (`basisEintraege` des Feature-Katalogs, z. B.
 * Bereitschaftszulage nur bei Bereitschaft).
 *
 * @param formular - Formularcode.
 * @returns Die für dieses Formular sichtbaren Basis-Einträge.
 */
function basisFuer(formular: FormularCode): KatalogEintrag[] {
  return [...BASIS, ...(featureKatalog(formular).basisEintraege ?? [])];
}

/**
 * Zeilenlisten im Download-Body, aus denen eine Tabelle gespeist wird (Beitrag des Features).
 *
 * @param formular - Formularcode.
 * @returns Zeilenquellen; leer ohne geladenes Feature.
 */
export function zeilenQuellen(formular: FormularCode): { pfad: string; label: string }[] {
  return featureKatalog(formular).zeilenQuellen;
}

/**
 * Auswahl für Kopf-/Fuß-/Übertrags-Felder: alles außerhalb der Datentabelle.
 *
 * @param formular - Formularcode.
 * @returns Basisfelder plus je Zeilenquelle die ganze Liste.
 */
export function katalogFelder(formular: FormularCode): KatalogEintrag[] {
  return [
    ...basisFuer(formular),
    ...zeilenQuellen(formular).map(q => ({ pfad: q.pfad, label: `${q.label} (ganze Liste)`, gruppe: 'Daten' })),
  ];
}

/**
 * Auswahl für Tabellenspalten und das `feld` in Summenfeldern: Felder EINER Datenzeile. `quelle` (meist
 * `tabelle.quelle`) grenzt auf eine Zeilenquelle ein -- sonst tauchen bei Bereitschaft (BZ/BE) Felder der
 * anderen Tabelle mit auf. Ohne Angabe alle Einträge.
 *
 * @param formular - Formularcode.
 * @param quelle - Zeilenquelle (`zeilenQuellen(formular)[].pfad`), ohne Angabe alle.
 * @returns Die passenden Zeilenfelder.
 */
export function katalogZeilenFelder(formular: FormularCode, quelle?: string): KatalogEintrag[] {
  const eintraege = featureKatalog(formular).zeilenFelder;
  return quelle === undefined ? eintraege : eintraege.filter(e => e.quelle === undefined || e.quelle === quelle);
}

/**
 * Zeilenfeld-Eintrag ueber alle geladenen Formulare (Werteliste/`boolean` haengen am Feldnamen, nicht am Formular).
 *
 * @param feld - Zeilenfeld.
 * @param passt - Eigenschaft, die der Eintrag tragen muss.
 * @returns Erster passender Eintrag; ohne geladenes Feature `undefined`.
 */
function zeilenFeld(feld: string, passt: (eintrag: KatalogEintrag) => boolean): KatalogEintrag | undefined {
  for (const katalog of featureKataloge().values()) {
    const eintrag = katalog.zeilenFelder.find(e => e.pfad === feld && passt(e));
    if (eintrag) return eintrag;
  }
  return undefined;
}

/**
 * Auswählbare Werte eines Zeilenfeldes (`KatalogEintrag.werte`).
 *
 * @param feld - Zeilenfeld.
 * @returns Die auswählbaren Werte; leer für Freitext-Felder.
 */
export function werteAuswahl(feld: string): string[] {
  return zeilenFeld(feld, e => e.werte !== undefined)?.werte ?? [];
}

/**
 * Liefert das Feld einen echten `boolean` (`KatalogEintrag.boolean`)?
 *
 * @param feld - Zeilenfeld.
 * @returns `true` für Felder mit echtem `boolean`-Wert.
 */
export function istBooleanFeld(feld: string): boolean {
  return zeilenFeld(feld, e => e.boolean === true) !== undefined;
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
 * Kurztexte der Zulagen-Codes einer Kategorie.
 *
 * @param kategorie - Zulagen-Kategorie.
 * @returns Kurztext je Zulagen-Code.
 */
export function zulagenKurztexte(kategorie: ZulageCategory): Record<string, string> {
  return Object.fromEntries(ZULAGEN_CATALOG.filter(z => z.category === kategorie).map(z => [z.code, z.shortLabel]));
}

/**
 * Fertige Listen-Gruppen eines Formulars (Beitrag des Features; bisher nur EZ).
 *
 * @param formular - Formularcode.
 * @returns Listen-Vorlagen; leer ohne Beitrag.
 */
export function listenVorlagen(formular: FormularCode): ListenVorlage[] {
  return featureKatalog(formular).listenVorlagen ?? [];
}

/**
 * Kategorie zu einer Listen-Vorlage (Beitrag der Features; bisher nur EZ), für die Kurztext-Umschaltung im Editor.
 *
 * @param name - Name der Listen-Vorlage.
 * @returns Zulagen-Kategorie oder `undefined`.
 */
export function vorlagenKategorie(name: string): ZulageCategory | undefined {
  for (const katalog of featureKataloge().values()) {
    const kategorie = katalog.vorlagenKategorie?.[name];
    if (kategorie !== undefined) return kategorie;
  }
  return undefined;
}
