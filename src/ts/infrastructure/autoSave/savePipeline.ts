import type { CustomTable, CustomTableTypes, Row, TableChanges } from '../table/CustomTable';
import type { CustomHTMLTableElement, TResourceKey } from '@/types';
import type { BulkErrorEntry, BulkRequest } from '../api/apiService';
import { resourceDef } from '../data/resourceConfig';
import { buildCreatePayloadWithClientRequestId, mapServerDocToFrontend } from './changeTracking';

export type ErrorSourceState = 'new' | 'modified' | 'deleted';

export interface RowErrorMatch {
  row: Row<CustomTableTypes>;
  error: BulkErrorEntry;
  sourceState: ErrorSourceState;
}

const ERROR_OPERATION_STATE_MAP: Record<BulkErrorEntry['operation'], ErrorSourceState> = {
  create: 'new',
  update: 'modified',
  delete: 'deleted',
};

/**
 * Sucht die `CustomTable`-Instanz zu einer Tabellen-Id im DOM.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param id - Element-Id der Tabelle (ohne `#`).
 * @returns Tabelleninstanz, `null` wenn das Element fehlt oder keine Instanz traegt.
 */
export function findTable<T extends CustomTableTypes>(id: string): CustomTable<T> | null {
  const el = document.querySelector<CustomHTMLTableElement<T>>(`#${id}`);
  return el?.instance ?? null;
}

/**
 * Uebernimmt die vom Server zurueckgegebenen Dokumente (`created`/`updated`) per `_id` in die Zeilen
 * der Tabelle, ohne deren Zustand zu aendern, und zeichnet neu. Nicht abbildbare Dokumente werden
 * uebersprungen.
 *
 * @param resource - Ressource der Tabelle.
 * @param table - Zieltabelle.
 * @param result - Bulk-Antwort mit `created`/`updated`.
 */
export function applyServerRowsToTable(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  result: { created?: unknown[]; updated?: unknown[] },
): void {
  const serverRowsById = new Map<string, CustomTableTypes>();

  [...(result.created ?? []), ...(result.updated ?? [])].forEach(doc => {
    try {
      const row = mapServerDocToFrontend(resource, doc);
      const id = (row as { _id?: string })._id;
      if (id) serverRowsById.set(id, row);
    } catch {
      // Bei unvollständigen Dokumenten den Sync überspringen und den lokalen Zustand behalten.
    }
  });

  table.rows.syncCellsSilently(row => {
    if (!row._id) return null;
    return serverRowsById.get(row._id) ?? null;
  });

  if (typeof table.drawRows === 'function') table.drawRows();
}

/**
 * Ordnet Bulk-Fehler den Zeilen zu: bei `create` per `clientRequestId`, sonst per `_id`, zuletzt
 * ueber die Payload-Position (`index`, nur `create`/`update`).
 *
 * @param createRows - Snapshot aus `getChangeRows()`, VOR dem Request genommen. Nur so stimmen die
 *   Positionen des Index-Fallbacks mit dem gesendeten Payload ueberein; waehrend des Requests
 *   entstandene Zeilen wuerden sie verschieben (AutoSave-Commit-Race).
 * @param updateRows - Wie `createRows`, fuer `update`-Fehler.
 * @param deleteRows - Wie `createRows`, nur fuer den `_id`-Abgleich bei `delete`-Fehlern.
 * @param errors - Fehlereintraege der Bulk-Antwort.
 * @returns Treffer je zuordenbarem Fehler; nicht zuordenbare Fehler entfallen.
 */
export function collectRowErrorMatches(
  createRows: Row<CustomTableTypes>[],
  updateRows: Row<CustomTableTypes>[],
  deleteRows: Row<CustomTableTypes>[],
  errors: BulkErrorEntry[],
): RowErrorMatch[] {
  const matches: RowErrorMatch[] = [];

  for (const error of errors) {
    let row: Row<CustomTableTypes> | undefined;

    if (error.operation === 'create' && error.clientRequestId) {
      row = createRows.find(candidate => candidate._clientRequestId === error.clientRequestId);
    }

    if (!row && error.id) {
      row = [...createRows, ...updateRows, ...deleteRows].find(candidate => candidate._id === error.id);
    }

    // Fallback: Backend liefert index (Position im create/update-Array)
    if (!row && typeof error.index === 'number') {
      if (error.operation === 'create') row = createRows[error.index];
      else if (error.operation === 'update') row = updateRows[error.index];
    }

    if (!row) continue;
    matches.push({ row, error, sourceState: ERROR_OPERATION_STATE_MAP[error.operation] });
  }

  return matches;
}

/**
 * Sendet die Aenderungen einer Ressource als Bulk-Requests, gruppiert nach Monat/Jahr des jeweiligen
 * Datensatzes (aufsteigend). Loeschungen gehen nur im ersten Request mit; enthaelt der Save nur
 * Loeschungen, laeuft ein Request fuer `monat`/`jahr`. Die Teilergebnisse werden zusammengefuehrt.
 *
 * @param resource - Ressource der Tabelle.
 * @param table - Tabelle, aus der die `clientRequestId`s der neuen Zeilen stammen.
 * @param changes - Zu sendende Aenderungen (`create`/`update`/`delete`).
 * @param monat - Fallback-Monat (1-12), wenn ein Datensatz kein gueltiges Datum hat, und Monat fuer reine Loeschungen.
 * @param jahr - Fallback-Jahr, siehe `monat`.
 * @returns Vereinigte Bulk-Antwort; alle Listen leer, wenn nichts zu senden war.
 */
export async function sendBulk(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  changes: TableChanges<CustomTableTypes>,
  monat: number,
  jahr: number,
): Promise<{
  created: unknown[];
  updated: unknown[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: BulkErrorEntry[];
}> {
  type SavePeriod = { monat: number; jahr: number };

  /**
   * Bestimmt Monat/Jahr eines Datensatzes aus seinem Datumsfeld (Format je Ressource).
   *
   * @param item - Zellen der Zeile.
   * @returns Monat (1-12) und Jahr; `monat`/`jahr` des Aufrufs bei ungueltigem Datum.
   */
  const getPeriod = (item: CustomTableTypes): SavePeriod => resourceDef(resource).periodOf(item) ?? { monat, jahr };

  const allCreateItems = buildCreatePayloadWithClientRequestId(resource, table, changes.create);

  const createItems = allCreateItems;

  if (createItems.length === 0 && changes.update.length === 0 && changes.delete.length === 0) {
    return { created: [], updated: [], deleted: [], createdReferences: [], errors: [] };
  }

  const createByPeriod = new Map<string, (CustomTableTypes & { clientRequestId: string })[]>();
  const updateByPeriod = new Map<string, (CustomTableTypes & { _id: string })[]>();
  const periods = new Map<string, SavePeriod>();

  /**
   * Schluessel fuer die Gruppierung nach Zeitraum.
   *
   * @param period - Monat und Jahr.
   * @returns `Jahr-Monat`.
   */
  const toPeriodKey = (period: SavePeriod): string => `${period.jahr}-${period.monat}`;

  for (const item of createItems) {
    const period = getPeriod(item);
    const key = toPeriodKey(period);
    const arr = createByPeriod.get(key) ?? [];
    arr.push(item);
    createByPeriod.set(key, arr);
    periods.set(key, period);
  }

  for (const item of changes.update as (CustomTableTypes & { _id: string })[]) {
    const period = getPeriod(item);
    const key = toPeriodKey(period);
    const arr = updateByPeriod.get(key) ?? [];
    arr.push(item);
    updateByPeriod.set(key, arr);
    periods.set(key, period);
  }

  const sortedPeriods = Array.from(periods.values()).sort((a, b) => {
    if (a.jahr !== b.jahr) return a.jahr - b.jahr;
    return a.monat - b.monat;
  });

  const combined: {
    created: unknown[];
    updated: unknown[];
    deleted: string[];
    createdReferences?: { _id: string; clientRequestId: string }[];
    errors: BulkErrorEntry[];
  } = { created: [], updated: [], deleted: [], createdReferences: [], errors: [] };

  /**
   * Ruft den Bulk-Endpunkt der Ressource fuer einen Zeitraum auf.
   *
   * @param period - Zeitraum der `create`/`update`-Eintraege.
   * @param withDelete - Ob die Loeschungen in diesem Request mitgehen.
   * @returns Bulk-Antwort des Servers.
   */
  const callBulk = async (period: SavePeriod, withDelete: boolean) => {
    const key = toPeriodKey(period);
    const bulk: BulkRequest = {
      create: createByPeriod.get(key) ?? [],
      update: updateByPeriod.get(key) ?? [],
      delete: withDelete ? changes.delete : [],
    };

    return resourceDef(resource).api.bulk(bulk as never, period.monat, period.jahr);
  };

  if (sortedPeriods.length === 0) {
    const result = await callBulk({ monat, jahr }, true);
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    if (result.createdReferences) combined.createdReferences?.push(...result.createdReferences);
    combined.errors.push(...result.errors);
    return combined;
  }

  let deleteSent = false;
  for (const period of sortedPeriods) {
    const result = await callBulk(period, !deleteSent);
    deleteSent = deleteSent || changes.delete.length > 0;
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    if (result.createdReferences) combined.createdReferences?.push(...result.createdReferences);
    combined.errors.push(...result.errors);
  }

  return combined;
}
