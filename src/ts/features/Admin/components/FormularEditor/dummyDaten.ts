import { operandenFelder, tabellenZeilen } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Feld, SeitenDef, Spalte, TabellenDef, Zeile, ZeilenBerechnet, ZeilenOpName } from '@otto-kirchheim/nebengeld-shared';
import { datenPlatzhalter, type Kontext, type TabellenZeilen } from '@/infrastructure/pdf/wert';
import { beispielWert, type FormularCode } from './datenKatalog';
import { verteile } from '@/infrastructure/pdf/verteile';

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

/**
 * Woher die Werte kommen. `platzhalter` erzeugt generische Füllwerte („Testwert 1"), die vor allem
 * zeigen, WELCHE Zelle welcher Konfiguration entspricht. `beispiel` nimmt die im Datenkatalog
 * hinterlegten, fachlich passenden Werte -- damit sieht die Vorschau aus wie ein echtes Formular.
 */
export type Werteart = 'platzhalter' | 'beispiel';

function platzhalter(feld: Feld | Spalte, index: number, name?: string): string | number {
  if (feld.format && ZAHL_FORMATE.includes(feld.format)) return 12.3 + index;
  if (feld.format && DATUMS_FORMATE.includes(feld.format)) return new Date(2026, 0, index + 1).toISOString();
  if (feld.format === 'uhrzeit' || feld.format === 'stunden') return `${8 + (index % 10)}:15`;
  // Bei zusammengesetzten Feldern steht `name` für den einzelnen Teil, sonst für das ganze Feld.
  const bezeichnung = name?.split('.').at(-1) ?? feld.label;
  return bezeichnung ? `${bezeichnung} (Test)` : `Testwert ${index + 1}`;
}

/** Katalogwert, wenn die Beispiel-Werteart gewählt ist und für den Pfad einer hinterlegt ist. */
function ausKatalog(art: Werteart, formular: FormularCode, pfad: string, index: number): unknown {
  return art === 'beispiel' ? beispielWert(formular, pfad, index) : undefined;
}

/**
 * Alle Datenpfade, die eine Seite tatsächlich aus den Nutzdaten liest -- also weder berechnete
 * Aggregationen noch feste Texte. Zusammengesetzte Felder liefern je einen Pfad pro Teil.
 */
function datenpfade(seite: SeitenDef | undefined): [string, Feld][] {
  if (!seite) return [];
  return Object.entries(seite.felder).flatMap(([key, f]) => {
    // Aggregationen rechnen über die Zeilen, lesen also keinen eigenen Pfad.
    if (f.berechnet) return [];
    // Der KEY eines Textfeldes ist frei gewählt und kein Datenpfad -- die Pfade stecken in den
    // Platzhaltern des Textes. Genau die befüllen, sonst bliebe z.B. `Zulagen {Monat}/{Jahr}` in
    // der Vorschau als "Zulagen /" stehen. `{seite}`/`{heute}` bedient der Kontext.
    if (f.text !== undefined) return datenPlatzhalter(f.text).map(pfad => [pfad, f] as [string, Feld]);
    if (f.quellen) return f.quellen.map(pfad => [pfad, f] as [string, Feld]);
    return [[key, f] as [string, Feld]];
  });
}

/**
 * Dummy-Wert für einen Operanden einer Zeilenrechnung. `stelle` ist die Position im Operandenfeld:
 * Zeit-Operatoren rechnen `erster − folgende`, deshalb bekommt die erste Stelle den SPÄTEREN
 * Zeitpunkt — sonst zeigt die Vorschau überall eine Dauer von 0 oder negative Werte.
 */
function operandPlatzhalter(op: ZeilenOpName, index: number, stelle: number): string | number {
  if (op === 'zeitdifferenz') return `${Math.max(0, 20 - stelle * 3) + (index % 3)}:00`;
  if (op === 'zeitspanne') return new Date(Date.UTC(2026, 2, 2 + index * 2 + Math.max(0, 3 - stelle), 8, 0)).toISOString();
  return index + 2;
}

/**
 * Berechnete Spalten haben keinen eigenen Datenwert -- ihre Operanden brauchen welche, sonst rechnet
 * die Vorschau immer mit 0. Rekursiv, da ein Operand selbst eine Zwischenrechnung sein darf; der
 * Wert-Typ richtet sich nach dem Operator des Knotens, in dem der Operand steht.
 */
function fuelleOperanden(berechnet: ZeilenBerechnet, zeile: Zeile, index: number): void {
  berechnet.operanden.forEach((operand, stelle) => {
    if (typeof operand === 'number') return;
    if (typeof operand === 'object') return fuelleOperanden(operand, zeile, index);
    zeile[operand] ??= operandPlatzhalter(berechnet.op, index, stelle);
  });
}

/** Wie viele Zeilen eine Tabelle braucht, damit die Vorschau ihren Seitenüberlauf zeigt. */
function zeilenBedarf(name: string, ersteSeite: SeitenDef, weitereSeite: SeitenDef | undefined): number {
  const platz = (seite: SeitenDef | undefined) => seite?.bereiche.find(b => b.tabelle === name)?.maxZeilen ?? 0;
  const erste = platz(ersteSeite);
  const weitere = platz(weitereSeite);
  return weitere > 0 ? erste + weitere + 1 : erste;
}

function macheZeile(tabelle: TabellenDef, index: number, art: Werteart, formular: FormularCode): Zeile {
  const zeile: Zeile = {};
  for (const spalte of tabelle.spalten) {
    if (spalte.wenn) {
      // Jede zweite Zeile erfüllt die Bedingung, damit man in der Vorschau beide Fälle sieht.
      if (index % 2 === 0) zeile[spalte.wenn.feld] ??= spalte.wenn.werte[0] ?? '';
    } else if (spalte.berechnet) {
      // Erst die Operanden aus dem Katalog belegen, sonst gewinnt der generische Zeitwert per `??=`.
      for (const pfad of operandenFelder(spalte.berechnet)) {
        const wert = ausKatalog(art, formular, pfad, index);
        if (wert !== undefined) zeile[pfad] ??= wert as string | number;
      }
      fuelleOperanden(spalte.berechnet, zeile, index);
    } else {
      zeile[spalte.key] = (ausKatalog(art, formular, spalte.key, index) as string | number) ?? platzhalter(spalte, index, spalte.key);
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
  formular: FormularCode,
  art: Werteart = 'platzhalter',
): Daten {
  const daten: Daten = {};

  for (const [pfad, feld] of [...datenpfade(ersteSeite), ...datenpfade(weitereSeite)]) {
    setzePfad(daten, pfad, ausKatalog(art, formular, pfad, 0) ?? platzhalter(feld, 0, pfad));
  }

  // Mehrere Tabellen dürfen sich eine Quelle teilen (nur der Filter trennt sie) -- die Zeilen
  // deshalb je Quelle sammeln statt sie gegenseitig zu überschreiben.
  const jeQuelle = new Map<string, Zeile[]>();
  for (const [name, tabelle] of Object.entries(tabellen)) {
    const anzahl = Math.max(zeilenBedarf(name, ersteSeite, weitereSeite), 1);
    const zeilen = Array.from({ length: anzahl }, (_, i) => macheZeile(tabelle, i, art, formular));
    jeQuelle.set(tabelle.quelle, [...(jeQuelle.get(tabelle.quelle) ?? []), ...zeilen]);
  }
  for (const [quelle, zeilen] of jeQuelle) setzePfad(daten, quelle, zeilen);

  return daten;
}

function verbinde(a: TabellenZeilen, b: TabellenZeilen): TabellenZeilen {
  const zusammen: TabellenZeilen = { ...a };
  for (const [name, zeilen] of Object.entries(b)) zusammen[name] = [...(zusammen[name] ?? []), ...zeilen];
  return zusammen;
}

/**
 * Beispieldaten PLUS den Kontext, den der Renderer benutzt -- damit die Werte-Vorschau im Editor
 * dieselben Zahlen zeigt wie das erzeugte PDF, insbesondere Summen (`$alle`/`$seite`) und den
 * Übertrag (`$bisher`). Ohne echten Kontext blieben genau diese Felder auf 0 stehen.
 *
 * Die Zeilen werden dafür über `verteile()` auf Seiten aufgeteilt und die zum angezeigten Tab
 * passende Seite ausgewählt: auf „weitere Seite" ist `$bisher` dadurch gefüllt, der Übertrag also
 * sichtbar. Wirft `verteile()` (unfertige Konfiguration während des Bearbeitens), fällt die
 * Vorschau auf eine einzelne Seite zurück, statt die Feldliste unbrauchbar zu machen.
 */
export function erzeugeVorschau(
  tabellen: Record<string, TabellenDef>,
  ersteSeite: SeitenDef,
  weitereSeite: SeitenDef | undefined,
  tab: 'erste' | 'weitere',
  formular: FormularCode,
  art: Werteart = 'beispiel',
): { daten: Daten; kontext: Kontext } {
  const daten = erzeugeDummyDaten(tabellen, ersteSeite, weitereSeite, formular, art);
  const alle: TabellenZeilen = Object.fromEntries(Object.entries(tabellen).map(([name, def]) => [name, tabellenZeilen(daten, def)]));
  const heute = new Date();

  try {
    const bloecke = verteile(alle, { template: '', ersteSeite, weitereSeite });
    const index = tab === 'weitere' ? bloecke.length - 1 : 0;
    const block = bloecke[index];
    if (!block) throw new Error('keine Seite');
    const bisher = bloecke.slice(0, index).reduce<TabellenZeilen>((s, b) => verbinde(s, b.zeilen), {});
    return { daten, kontext: { $seite: block.zeilen, $bisher: bisher, $laufend: verbinde(bisher, block.zeilen), $alle: alle, seite: index + 1, seiten: bloecke.length, heute } };
  } catch {
    return { daten, kontext: { $seite: alle, $bisher: {}, $laufend: alle, $alle: alle, seite: 1, seiten: 1, heute } };
  }
}
