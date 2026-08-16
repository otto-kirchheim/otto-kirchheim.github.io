import { FORMAT, berechneZeile } from '@otto-kirchheim/nebengeld-shared';
import type { Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';

/**
 * Löst eine Tabellenspalte gegen EINE Datenzeile auf. `berechnet` rechnet über Werte derselben
 * Zeile (Operand = Feldname der Zeile oder Konstante) — im Unterschied zu `wert.ts`, das über
 * mehrere Zeilen aggregiert (Kopf-/Fuß-Summen). `wenn` macht die Spalte zur Ankreuz-Spalte.
 */
export function spaltenWert(sp: Spalte, zeile: Zeile): string {
  if (sp.wenn) {
    return sp.wenn.werte.includes(zeile[sp.wenn.feld] as string | number) ? sp.wenn.dann : '';
  }

  if (!sp.berechnet) {
    const roh = zeile[sp.key];
    if (roh === null || roh === undefined) return '';
    return sp.format ? FORMAT[sp.format](roh) : String(roh);
  }

  // Auswertung liegt in `shared`, weil sie rekursiv ist (Operanden dürfen Zwischenrechnungen sein)
  // und je Operator einen eigenen Parser braucht -- `Number("07:00")` wäre NaN.
  const ergebnis = berechneZeile(sp.berechnet, zeile);
  return sp.format ? FORMAT[sp.format](ergebnis) : String(ergebnis);
}
