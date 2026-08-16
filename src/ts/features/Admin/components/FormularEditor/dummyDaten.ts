import type { Daten, Feld, SeitenDef, Spalte, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

function setzePfad(ziel: Daten, pfad: string, wert: unknown): void {
  const teile = pfad.split('.');
  let knoten = ziel as Record<string, unknown>;
  for (const teil of teile.slice(0, -1)) {
    if (typeof knoten[teil] !== 'object' || knoten[teil] === null) knoten[teil] = {};
    knoten = knoten[teil] as Record<string, unknown>;
  }
  knoten[teile.at(-1)!] = wert;
}

const DATUMS_FORMATE = ['datum', 'datumKurz', 'tag', 'wochentag', 'monatJahr'];
const ZAHL_FORMATE = ['waehrung', 'zahl', 'ganzzahl'];

function platzhalter(feld: Feld | Spalte, index: number, name?: string): string | number {
  if (feld.format && ZAHL_FORMATE.includes(feld.format)) return 12.3 + index;
  if (feld.format && DATUMS_FORMATE.includes(feld.format)) return new Date(2026, 0, index + 1).toISOString();
  if (feld.format === 'uhrzeit' || feld.format === 'stunden') return `${8 + (index % 10)}:15`;
  // Bei zusammengesetzten Feldern steht `name` für den einzelnen Teil, sonst für das ganze Feld.
  const bezeichnung = name?.split('.').at(-1) ?? feld.label;
  return bezeichnung ? `${bezeichnung} (Test)` : `Testwert ${index + 1}`;
}

/**
 * Alle Datenpfade, die eine Seite tatsächlich aus den Nutzdaten liest -- also weder berechnete
 * Aggregationen noch feste Texte. Zusammengesetzte Felder liefern je einen Pfad pro Teil.
 */
function datenpfade(seite: SeitenDef | undefined): [string, Feld][] {
  if (!seite) return [];
  return Object.entries(seite.felder).flatMap(([key, f]) => {
    // Berechnete Felder und feste Texte lesen nichts aus den Daten -- Platzhalter im Text bleiben
    // in der Vorschau bewusst unbefüllt, sonst würde `{seite}` mit Dummy-Werten überschrieben.
    if (f.berechnet || f.text !== undefined) return [];
    if (f.quellen) return f.quellen.map(pfad => [pfad, f] as [string, Feld]);
    return [[key, f] as [string, Feld]];
  });
}

/** Wie viele Zeilen eine Tabelle braucht, damit die Vorschau ihren Seitenüberlauf zeigt. */
function zeilenBedarf(name: string, ersteSeite: SeitenDef, weitereSeite: SeitenDef | undefined): number {
  const platz = (seite: SeitenDef | undefined) => seite?.bereiche.find(b => b.tabelle === name)?.maxZeilen ?? 0;
  const erste = platz(ersteSeite);
  const weitere = platz(weitereSeite);
  return weitere > 0 ? erste + weitere + 1 : erste;
}

function macheZeile(tabelle: TabellenDef, index: number): Zeile {
  const zeile: Zeile = {};
  for (const spalte of tabelle.spalten) {
    if (spalte.wenn) {
      // Jede zweite Zeile erfüllt die Bedingung, damit man in der Vorschau beide Fälle sieht.
      if (index % 2 === 0) zeile[spalte.wenn.feld] ??= spalte.wenn.werte[0] ?? '';
    } else if (spalte.berechnet) {
      // Berechnete Spalten haben keinen eigenen Datenwert -- ihre Operanden brauchen Werte, sonst
      // rechnet die Vorschau immer mit 0.
      for (const op of spalte.berechnet.operanden) {
        if (typeof op !== 'string') continue;
        zeile[op] ??= spalte.berechnet.op === 'zeitdifferenz' ? `${7 + (index % 8)}:00` : index + 2;
      }
    } else {
      zeile[spalte.key] = platzhalter(spalte, index);
    }
  }
  // Der Tabellenfilter muss zutreffen, sonst wäre die Tabelle in der Vorschau leer.
  if (tabelle.filter) zeile[tabelle.filter.feld] = tabelle.filter.werte[0] ?? '';
  return zeile;
}

/**
 * Testdaten für die Vorschau im FormularEditor. Je Tabelle genug Zeilen, um ihren Bereich auf der
 * ersten Seite UND (falls konfiguriert) auf der Folgeseite zu überschreiten, damit `verteile()`
 * den Seitenumbruch tatsächlich zeigt. Ohne Folgeseiten-Bereich bleibt es bei genau der Kapazität
 * der ersten Seite, sonst würde `build()` werfen.
 */
export function erzeugeDummyDaten(
  tabellen: Record<string, TabellenDef>,
  ersteSeite: SeitenDef,
  weitereSeite: SeitenDef | undefined,
): Daten {
  const daten: Daten = {};

  for (const [pfad, feld] of [...datenpfade(ersteSeite), ...datenpfade(weitereSeite)]) {
    setzePfad(daten, pfad, platzhalter(feld, 0, pfad));
  }

  // Mehrere Tabellen dürfen sich eine Quelle teilen (nur der Filter trennt sie) -- die Zeilen
  // deshalb je Quelle sammeln statt sie gegenseitig zu überschreiben.
  const jeQuelle = new Map<string, Zeile[]>();
  for (const [name, tabelle] of Object.entries(tabellen)) {
    const anzahl = Math.max(zeilenBedarf(name, ersteSeite, weitereSeite), 1);
    const zeilen = Array.from({ length: anzahl }, (_, i) => macheZeile(tabelle, i));
    jeQuelle.set(tabelle.quelle, [...(jeQuelle.get(tabelle.quelle) ?? []), ...zeilen]);
  }
  for (const [quelle, zeilen] of jeQuelle) setzePfad(daten, quelle, zeilen);

  return daten;
}
