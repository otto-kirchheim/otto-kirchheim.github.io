import type { CustomTable, CustomTableTypes, Row, RowState } from '../../shared/ui/custom-table/CustomTable';
import type { IDatenBZ, IDatenEWT, TResourceKey } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';

interface OverlapWindow {
  start: number;
  end: number;
}

/**
 * Zeitfenster eines Bereitschaftszeitraums aus `Beginn`/`Ende`.
 *
 * @param cells - Zellen einer BZ-Zeile.
 * @returns Fenster in ms, `null` bei ungueltigem Datum.
 */
function getBzWindow(cells: CustomTableTypes): OverlapWindow | null {
  const bz = cells as IDatenBZ;
  const start = dayjs(String(bz.Beginn));
  const end = dayjs(String(bz.Ende));
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.valueOf(), end: end.valueOf() };
}

/**
 * Zeitfenster einer EWT-Zeile aus `Tag`, `beginE` und `endeE`. Spiegelt `getWindowForOverlap` im
 * Backend (`ewt.service.ts`) und `features/EWT/utils/getEwtWindow.ts`: Endet die Schicht nicht nach
 * dem Beginn (Nachtschicht), rollt das Ende auf den Folgetag, `Tag` bleibt der Starttag. Lokal
 * dupliziert, da `infrastructure/` nicht von `features/` abhaengen darf.
 *
 * @param cells - Zellen einer EWT-Zeile.
 * @returns Fenster in ms, `null` ohne Zeiten oder bei ungueltigem `Tag`.
 */
function getEwtWindowLocal(cells: CustomTableTypes): OverlapWindow | null {
  const ewt = cells as IDatenEWT;
  if (!ewt.beginE || !ewt.endeE) return null;
  const baseDate = dayjs(ewt.Tag as string);
  if (!baseDate.isValid()) return null;

  const start = dayjs(`${baseDate.format('YYYY-MM-DD')}T${String(ewt.beginE)}`);
  let end = dayjs(`${baseDate.format('YYYY-MM-DD')}T${String(ewt.endeE)}`);
  if (end.isSameOrBefore(start)) end = end.add(1, 'day');

  return { start: start.valueOf(), end: end.valueOf() };
}

/** Nur Ressourcen mit einfacher, serverseitig gespiegelter Zeitfenster-Ueberschneidungspruefung. */
const WINDOW_RESOLVERS: Partial<
  Record<Exclude<TResourceKey, 'settings'>, (cells: CustomTableTypes) => OverlapWindow | null>
> = {
  BZ: getBzWindow,
  EWT: getEwtWindowLocal,
};

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
 * @returns Neue/geaenderte Zeilen mit Kollision; leer bei Ressourcen ohne Fensterpruefung.
 */
export function findOverlapBlockedRows(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
): Row<CustomTableTypes>[] {
  const getWindow = WINDOW_RESOLVERS[resource];
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
