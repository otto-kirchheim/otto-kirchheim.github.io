import {
  berechneZeile,
  FORMAT,
  listenWert,
  schluesselAufPlatz,
  standardText,
  trifftBedingung,
} from '@otto-kirchheim/nebengeld-shared';
import type { ListenAufloesung, Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';

/**
 * Löst eine Tabellenspalte gegen EINE Datenzeile auf. `berechnet` rechnet über Werte derselben
 * Zeile (Operand = Feldname der Zeile oder Konstante) — im Unterschied zu `wert.ts`, das über
 * mehrere Zeilen aggregiert (Kopf-/Fuß-Summen). `wenn` macht die Spalte zur Ankreuz-Spalte,
 * `listenPlatz` zur dynamischen Spalte (EZ: eine Zulage je Platz, siehe `ListenGruppe`).
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

  // Auswertung liegt in `shared`, weil sie rekursiv ist (Operanden dürfen Zwischenrechnungen sein)
  // und je Operator einen eigenen Parser braucht -- `Number("07:00")` wäre NaN.
  return formatiere(berechneZeile(sp.berechnet, zeile), sp);
}

function formatiere(roh: unknown, sp: Spalte): string {
  if (roh === null || roh === undefined) return '';
  return sp.format ? FORMAT[sp.format](roh) : standardText(roh);
}
