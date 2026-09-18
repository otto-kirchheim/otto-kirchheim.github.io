import type { SeitenDef } from '@otto-kirchheim/nebengeld-shared';

/** Neue leere Seite auf Basis der Vorlagen-Seite `quelle`. */
export function leereSeite(quelle = 0): SeitenDef {
  return { quelle, bereiche: [], felder: {} };
}

/**
 * Zeilenhöhe aus erster und letzter Datenzeile, über alle Zeilen gemittelt. Eine Einzelmessung an
 * nur einer Zeile ist zwangsläufig ungenau (freihändig gezogenes Band); der Renderer zieht je Zeile
 * dieselbe `hoehe` ab, wodurch sich Bruchteile eines Punktes über die Tabelle zu einem sichtbaren
 * Versatz aufsummieren. `null` bedeutet: nicht messbar (zu wenige Zeilen oder Reihenfolge vertauscht).
 */
export function zeilenHoeheAus(startY: number, letzteY: number, zeilen: number): number | null {
  if (zeilen < 2) return null;
  const hoehe = (startY - letzteY) / (zeilen - 1);
  return hoehe > 0 ? Number(hoehe.toFixed(2)) : null;
}
