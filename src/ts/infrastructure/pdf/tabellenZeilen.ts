import { berechneZeile, trifftBedingung } from './aggregatoren';
import { get } from './get';
import type { Daten, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

/**
 * Ergänzt die Zeile um die Werte ihrer BERECHNETEN und ANKREUZ-Spalten, abgelegt unter dem
 * Spalten-Key.
 *
 * Ohne das stünden berechnete Werte (z.B. Dauer aus Ende − Beginn) und Ankreuz-Ergebnisse (das
 * gedruckte Zeichen, sonst leer) nur beim Zeichnen zur Verfügung, nicht in den Daten -- eine Summe
 * darüber ergäbe still 0 (z.B. Anzahl LRE-1-Einsätze über eine Ankreuz-Spalte mit `dann: '1'`).
 * Die Zeile wird kopiert, die Nutzdaten bleiben unangetastet; ein gleichnamiges gespeichertes Feld
 * wird überschrieben, damit die Summe zum gedruckten Wert passt. Jede Spalte liest die UNVERÄNDERTE
 * `zeile`, nicht die Kopie -- eine Spalte darf also nicht auf einer anderen berechneten/Ankreuz-Spalte
 * aufbauen.
 *
 * @param zeile - Datenzeile aus den Nutzdaten.
 * @param tabelle - Tabellendefinition mit den Spalten.
 * @returns `zeile` selbst, wenn keine Spalte berechnet ist, sonst die ergänzte Kopie.
 */
function mitBerechnetenSpalten(zeile: Zeile, tabelle: TabellenDef): Zeile {
  const ergaenzte = tabelle.spalten.filter(sp => sp.berechnet || sp.wenn);
  if (ergaenzte.length === 0) return zeile;
  const kopie = { ...zeile };
  for (const sp of ergaenzte)
    kopie[sp.key] = sp.wenn
      ? trifftBedingung(sp.wenn, zeile)
        ? sp.wenn.dann
        : ''
      : berechneZeile(sp.berechnet!, zeile);
  return kopie;
}

/**
 * Liest die Zeilen einer Tabelle aus den Nutzdaten, wendet ihren Filter an und ergänzt die
 * berechneten Spalten. Mehrere Tabellen dürfen dieselbe Quelle nutzen und sich nur im Filter
 * unterscheiden — bei Bereitschaft speist `Daten.BE` je eine Tabelle für LRE 1+2 und für LRE 3.
 *
 * @param daten - Nutzdaten, aus denen `tabelle.quelle` gelesen wird.
 * @param tabelle - Tabellendefinition (Quelle, optionaler Filter, Spalten).
 * @returns Die gefilterten Zeilen inkl. berechneter Spalten; leer, wenn die Quelle fehlt.
 */
export function tabellenZeilen(daten: Daten, tabelle: TabellenDef): Zeile[] {
  const alle = (get(daten, tabelle.quelle) as Zeile[] | undefined) ?? [];
  const gefiltert = tabelle.filter
    ? alle.filter(zeile => tabelle.filter!.werte.includes(zeile[tabelle.filter!.feld] as string | number))
    : alle;
  return gefiltert.map(zeile => mitBerechnetenSpalten(zeile, tabelle));
}
