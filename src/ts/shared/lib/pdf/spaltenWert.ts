import { berechneZeile, FORMAT, standardText, trifftBedingung } from './aggregatoren';
import { listenWert, schluesselAufPlatz } from './listen';
import type { ListenAufloesung } from './listen';
import type { Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';

/**
 * Löst eine Tabellenspalte gegen EINE Datenzeile auf. `berechnet` rechnet über Werte derselben
 * Zeile (Operand = Feldname der Zeile oder Konstante) — im Unterschied zu `wert.ts`, das über
 * mehrere Zeilen aggregiert (Kopf-/Fuß-Summen). `wenn` macht die Spalte zur Ankreuz-Spalte,
 * `listenPlatz` zur dynamischen Spalte (EZ: eine Zulage je Platz, siehe `ListenGruppe`).
 *
 * @param sp - Spaltendefinition (Vorrang: `wenn`, dann `listenPlatz`, dann `berechnet`, sonst Feld `key`).
 * @param zeile - Datenzeile, gegen die aufgelöst wird.
 * @param listen - Aufgelöste Listen-Belegung der Tabelle; nur für `listenPlatz`-Spalten nötig.
 * @returns Der druckfertige Text; leer bei fehlendem Wert oder unbelegtem Listenplatz.
 */
export function spaltenWert(sp: Spalte, zeile: Zeile, listen?: ListenAufloesung): string {
  if (sp.wenn) {
    return trifftBedingung(sp.wenn, zeile) ? sp.wenn.dann : '';
  }

  if (sp.listenPlatz) {
    const gruppe = listen?.gruppen[sp.listenPlatz.gruppe];
    const schluessel = schluesselAufPlatz(listen, sp.listenPlatz.gruppe, sp.listenPlatz.index);
    // Kein Schlüssel = dieser Platz ist im Monat unbelegt; die Spalte bleibt dann komplett leer.
    if (!gruppe || schluessel === undefined) return '';
    return formatiere(listenWert(zeile, gruppe, schluessel), sp);
  }

  if (!sp.berechnet) return formatiere(zeile[sp.key], sp);

  // `berechneZeile` (aggregatoren.ts) ist rekursiv (Operanden dürfen Zwischenrechnungen sein) und
  // parst Operanden je Operator eigens -- `Number("07:00")` wäre NaN.
  return formatiere(berechneZeile(sp.berechnet, zeile), sp);
}

/**
 * Formatiert einen Rohwert gemäß `sp.format`, sonst als Standardtext.
 *
 * @param roh - Ungeformter Zellwert.
 * @param sp - Spalte, deren `format` maßgeblich ist.
 * @returns Der formatierte Text; leer bei `null`/`undefined`.
 */
function formatiere(roh: unknown, sp: Spalte): string {
  if (roh === null || roh === undefined) return '';
  return sp.format ? FORMAT[sp.format](roh) : standardText(roh);
}
