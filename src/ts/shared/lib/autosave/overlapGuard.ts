import type { CustomTable, CustomTableTypes, Row, RowState } from '../../ui/custom-table/CustomTable';
import type { TResourceKey } from '@/types';
import { resourceDef } from '@/shared/lib/ressource/resourceConfig';

interface OverlapWindow {
  start: number;
  end: number;
}

/**
 * Prueft, ob sich zwei Fenster ueberschneiden; reines Beruehren der Grenzen zaehlt nicht.
 *
 * @param a - Erstes Fenster.
 * @param b - Zweites Fenster.
 * @returns `true` bei echter Ueberschneidung.
 */
function windowsOverlap(a: OverlapWindow, b: OverlapWindow): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Liefert den fachlichen Zustand einer Zeile; bei `error` den Zustand, aus dem der Fehler entstand.
 *
 * @param row - Zeile mit `_state` und optional `_errorState`.
 * @returns Fachlicher Zustand, `unchanged` bei `error` ohne gemerkten Ursprungszustand.
 */
function effectiveState(row: { _state: RowState; _errorState?: Exclude<RowState, 'error'> }): RowState {
  return row._state === 'error' ? (row._errorState ?? 'unchanged') : row._state;
}

/**
 * Zeilen, die AutoSave nicht senden darf: Ihr Zeitfenster ueberschneidet sich mit einer lokal
 * geloeschten, noch nicht synchronisierten Zeile derselben Ressource. Serverseitig (`ensureNoOverlap`
 * bei BZ/EWT) existiert der Datensatz noch, solange AutoSave Loeschungen nicht mitsendet; nur das
 * manuelle Speichern tut das, und der Bulk-Endpunkt loescht zuerst (`base.controller.ts`).
 *
 * @param resource - Ressource der Tabelle.
 * @param table - Tabelle mit den lokalen Zeilen.
 * @returns Neue/geaenderte Zeilen mit Kollision; leer bei Ressourcen ohne `overlapWindow` (`meta.resources`).
 */
export function findOverlapBlockedRows(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
): Row<CustomTableTypes>[] {
  const getWindow = resourceDef(resource).overlapWindow;
  if (!getWindow) return [];

  const pendingDeleteWindows = table.rows.array
    .filter(row => effectiveState(row) === 'deleted')
    .map(row => getWindow(row.cells))
    .filter((window): window is OverlapWindow => window !== null);

  if (pendingDeleteWindows.length === 0) return [];

  return table.rows.array.filter(row => {
    const state = effectiveState(row);
    if (state !== 'new' && state !== 'modified') return false;
    const window = getWindow(row.cells);
    if (!window) return false;
    return pendingDeleteWindows.some(deleteWindow => windowsOverlap(window, deleteWindow));
  });
}
