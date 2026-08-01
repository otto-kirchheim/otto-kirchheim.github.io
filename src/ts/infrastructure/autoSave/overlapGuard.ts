import type { CustomTable, CustomTableTypes, Row, RowState } from '../table/CustomTable';
import type { IDatenBZ, IDatenEWT, TResourceKey } from '@/types';
import dayjs from '../date/configDayjs';

interface OverlapWindow {
  start: number;
  end: number;
}

function getBzWindow(cells: CustomTableTypes): OverlapWindow | null {
  const bz = cells as IDatenBZ;
  const start = dayjs(String(bz.Beginn));
  const end = dayjs(String(bz.Ende));
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.valueOf(), end: end.valueOf() };
}

/**
 * Spiegelt `getWindowForOverlap` aus dem Backend (`ewt.service.ts`) sowie das Frontend-Pendant
 * `features/EWT/utils/getEwtWindow.ts`: Nachtschichten duerfen ueber den Tagesbeginn rollen, `tagE`
 * bleibt dabei der echte Starttag. Lokal dupliziert statt importiert, da `infrastructure/` laut
 * Architektur nicht von `features/` abhaengen darf.
 */
function getEwtWindowLocal(cells: CustomTableTypes): OverlapWindow | null {
  const ewt = cells as IDatenEWT;
  if (!ewt.beginE || !ewt.endeE) return null;
  const baseDate = dayjs(ewt.tagE as string);
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

function windowsOverlap(a: OverlapWindow, b: OverlapWindow): boolean {
  return a.start < b.end && b.start < a.end;
}

function effectiveState(row: { _state: RowState; _errorState?: Exclude<RowState, 'error'> }): RowState {
  return row._state === 'error' ? (row._errorState ?? 'unchanged') : row._state;
}

/**
 * Zeilen, die AutoSave aktuell nicht senden darf: Ihr Zeitfenster ueberschneidet sich mit einer
 * bereits lokal geloeschten, aber noch nicht synchronisierten Zeile derselben Ressource. Serverseitig
 * (BZ/EWT `ensureNoOverlap`) existiert der geloeschte Datensatz noch, solange AutoSave Loeschungen
 * nicht mitsendet (nur manuelles Speichern tut das — Bulk-Reihenfolge Delete-vor-Create/Update ist
 * dort bereits abgesichert, siehe `base.controller.ts`).
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
