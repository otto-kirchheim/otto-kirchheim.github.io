import { FORMAT, ZEILEN_OPS, alsMinuten } from '@otto-kirchheim/nebengeld-shared';
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

  // Zeitrechnungen brauchen einen eigenen Parser -- `Number("07:00")` wäre NaN.
  const zuZahl = sp.berechnet.op === 'zeitdifferenz' ? alsMinuten : Number;
  const werte = sp.berechnet.operanden.map(op => (typeof op === 'number' ? op : zuZahl(zeile[op]) || 0));
  const ergebnis = ZEILEN_OPS[sp.berechnet.op](werte);
  return sp.format ? FORMAT[sp.format](ergebnis) : String(ergebnis);
}
