/**
 * AutoSave-Manager: Automatisches Speichern pro Ressource nach Inaktivität.
 *
 * - Löschungen werden NICHT automatisch gesendet (nur beim manuellen Speichern)
 * - Erstellt/Geänderte Zeilen werden nach konfigurierbarer Inaktivitätszeit gespeichert
 * - Status-Anzeige per SnackBar + optionales Badge
 * - Einstellungen (UserProfile) werden ebenfalls automatisch gespeichert
 */

import { aktualisiereBerechnung } from '../Berechnung';
import { createSnackBar } from '../class/CustomSnackbar';
import type { CustomTable, CustomTableTypes, Row, TableChanges } from '../class/CustomTable';
import type {
  CustomHTMLTableElement,
  IDatenBE,
  IDatenBZ,
  IDatenEWT,
  IDatenN,
  IVorgabenU,
  TResourceKey,
  TSaveStatus,
} from '../interfaces';
import {
  type BulkErrorEntry,
  type BulkRequest,
  bereitschaftseinsatzApi,
  bereitschaftszeitraumApi,
  ewtApi,
  nebengeldApi,
  profileApi,
} from './apiService';
import type {
  BackendBereitschaftseinsatz,
  BackendBereitschaftszeitraum,
  BackendEWT,
  BackendNebengeld,
} from './fieldMapper';
import { beFromBackend, bzFromBackend, ewtFromBackend, nebengeldFromBackend } from './fieldMapper';
import Storage from './Storage';
import type { TStorageData } from './Storage';
import dayjs from './configDayjs';
import mergeVisibleResourceRows from './mergeVisibleResourceRows';
import { v4 as uuidv4 } from 'uuid';

// ─── Konfiguration ───────────────────────────────────────
/** Mapping von TResourceKey auf Storage-Key */
const RESOURCE_STORAGE_MAP: Record<Exclude<TResourceKey, 'settings'>, TStorageData> = {
  BZ: 'dataBZ',
  BE: 'dataBE',
  EWT: 'dataE',
  N: 'dataN',
};
/** Auto-Save Verzögerung in Millisekunden (Standard: 10 Sekunden) */
let AUTO_SAVE_DELAY = 10000;

/** Auto-Save global aktiviert? */
let autoSaveEnabled = true;

/** online-Event Listener registriert? */
let onlineListenerRegistered = false;

// ─── Typen ───────────────────────────────────────────────

const TABLE_ID_MAP: Record<Exclude<TResourceKey, 'settings'>, string> = {
  BZ: 'tableBZ',
  BE: 'tableBE',
  EWT: 'tableE',
  N: 'tableN',
};

interface ResourceState {
  timer: ReturnType<typeof setTimeout> | null;
  status: TSaveStatus;
  lastSaved: Date | null;
  lastError: string | null;
}

type StatusListener = (resource: TResourceKey, status: TSaveStatus, error?: string) => void;
type ErrorSourceState = 'new' | 'modified' | 'deleted';

interface RowErrorMatch {
  row: Row<CustomTableTypes>;
  error: BulkErrorEntry;
  sourceState: ErrorSourceState;
}

// ─── State ───────────────────────────────────────────────

const resourceStates: Record<TResourceKey, ResourceState> = {
  BZ: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  BE: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  EWT: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  N: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  settings: { timer: null, status: 'idle', lastSaved: null, lastError: null },
};

const statusListeners: StatusListener[] = [];
const ERROR_OPERATION_STATE_MAP: Record<BulkErrorEntry['operation'], ErrorSourceState> = {
  create: 'new',
  update: 'modified',
  delete: 'deleted',
};

// ─── Hilfsfunktionen ─────────────────────────────────────

function setStatus(resource: TResourceKey, status: TSaveStatus, error?: string): void {
  const state = resourceStates[resource];
  state.status = status;
  if (status === 'saved') state.lastSaved = new Date();
  if (status === 'error') state.lastError = error ?? 'Unbekannter Fehler';
  statusListeners.forEach(fn => fn(resource, status, status === 'error' ? (state.lastError ?? undefined) : undefined));
}

function mapServerDocToFrontend(resource: Exclude<TResourceKey, 'settings'>, doc: unknown): CustomTableTypes {
  switch (resource) {
    case 'BZ':
      return bzFromBackend(doc as BackendBereitschaftszeitraum);
    case 'BE':
      return beFromBackend(doc as BackendBereitschaftseinsatz);
    case 'EWT':
      return ewtFromBackend(doc as BackendEWT);
    case 'N':
      return nebengeldFromBackend(doc as BackendNebengeld);
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`);
  return `{${entries.join(',')}}`;
}

function createClientRequestId(): string {
  return uuidv4();
}

function rowSignature(resource: Exclude<TResourceKey, 'settings'>, row: CustomTableTypes): string {
  const source = row as Record<string, unknown>;
  const omitKeys = new Set<string>(['_id', 'updatedAt', 'createdAt', '__v']);

  // Serverseitig ergänzte/verknüpfte Felder sollen das Create-Matching nicht stören.
  if (resource === 'BE') omitKeys.add('bereitschaftszeitraumBE');
  if (resource === 'N') omitKeys.add('ewtRef');

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (omitKeys.has(key)) continue;
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return stableSerialize(normalized);
}

function buildCreatePayloadWithClientRequestId(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  createItems: CustomTableTypes[],
): (CustomTableTypes & { clientRequestId: string })[] {
  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');
  const idsBySignature = new Map<string, string[]>();

  for (const row of pendingNewRows) {
    if (!row._clientRequestId) row._clientRequestId = createClientRequestId();
    const signature = rowSignature(resource, row.cells);
    const queue = idsBySignature.get(signature) ?? [];
    queue.push(row._clientRequestId);
    idsBySignature.set(signature, queue);
  }

  return createItems.map(item => {
    const signature = rowSignature(resource, item);
    const queue = idsBySignature.get(signature);
    const clientRequestId = queue?.shift() ?? createClientRequestId();
    return { ...item, clientRequestId };
  });
}

function mapCreatedIdsByClientRequestId(
  table: CustomTable<CustomTableTypes>,
  createdReferences: { _id: string; clientRequestId: string }[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdReferences.length === 0) return createdIds;

  const idByClientRequestId = new Map(createdReferences.map(entry => [entry.clientRequestId, entry._id]));
  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');

  pendingNewRows.forEach((row, idx) => {
    if (!row._clientRequestId) return;
    const createdId = idByClientRequestId.get(row._clientRequestId);
    if (createdId) createdIds.set(idx, createdId);
  });

  return createdIds;
}

function mapCreatedIdsByContent(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  createdDocs: unknown[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdDocs.length === 0) return createdIds;

  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');

  const serverRows = createdDocs
    .map(doc => {
      try {
        const row = mapServerDocToFrontend(resource, doc);
        const id = (row as { _id?: string })._id;
        if (!id) return null;
        return { id, signature: rowSignature(resource, row) };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { id: string; signature: string } => entry !== null);

  const idsBySignature = new Map<string, string[]>();
  for (const entry of serverRows) {
    const queue = idsBySignature.get(entry.signature) ?? [];
    queue.push(entry.id);
    idsBySignature.set(entry.signature, queue);
  }

  const unassignedDocIds = [...serverRows.map(entry => entry.id)];

  pendingNewRows.forEach((row, idx) => {
    const signature = rowSignature(resource, row.cells);
    const queue = idsBySignature.get(signature);
    const matchedId = queue?.shift();

    if (matchedId) {
      createdIds.set(idx, matchedId);
      const removeIdx = unassignedDocIds.indexOf(matchedId);
      if (removeIdx >= 0) unassignedDocIds.splice(removeIdx, 1);
      return;
    }

    const fallbackId = unassignedDocIds.shift();
    if (fallbackId) createdIds.set(idx, fallbackId);
  });

  return createdIds;
}

function applyServerRowsToTable(
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

  for (const row of table.rows.array) {
    if (row._state === 'deleted' || !row._id) continue;
    const serverRow = serverRowsById.get(row._id);
    if (!serverRow) continue;
    row.cells = serverRow;
    row._originalCells = { ...serverRow };
  }

  if (typeof table.drawRows === 'function') table.drawRows();
}

function findTable<T extends CustomTableTypes>(id: string): CustomTable<T> | null {
  const el = document.querySelector<CustomHTMLTableElement<T>>(`#${id}`);
  return el?.instance ?? null;
}

function collectRowErrorMatches(table: CustomTable<CustomTableTypes>, errors: BulkErrorEntry[]): RowErrorMatch[] {
  const matches: RowErrorMatch[] = [];

  for (const error of errors) {
    let row: Row<CustomTableTypes> | undefined;

    if (error.operation === 'create' && error.clientRequestId) {
      row = table.rows.array.find(candidate => candidate._clientRequestId === error.clientRequestId);
    }

    if (!row && error.id) {
      row = table.rows.array.find(candidate => candidate._id === error.id);
    }

    if (!row) continue;
    matches.push({ row, error, sourceState: ERROR_OPERATION_STATE_MAP[error.operation] });
  }

  return matches;
}

function unlinkNebengeldRefsForDeletedEwtIds(deletedIds: string[]): void {
  if (deletedIds.length === 0) return;

  const deletedIdSet = new Set(deletedIds);

  const currentDataN = Storage.get<IDatenN[]>('dataN', { default: [] });
  let storageChanged = false;
  const nextDataN = currentDataN.map(item => {
    if (!item.ewtRef || !deletedIdSet.has(item.ewtRef)) return item;
    storageChanged = true;
    const { ewtRef: _removed, ...withoutRef } = item;
    return withoutRef as IDatenN;
  });
  if (storageChanged) {
    Storage.set('dataN', nextDataN);
  }

  const nebenTable = findTable<IDatenN>(TABLE_ID_MAP.N);
  if (!nebenTable) return;

  let tableChanged = false;
  for (const row of nebenTable.rows.array) {
    if (row._state === 'deleted') continue;
    const ref = (row.cells as IDatenN).ewtRef;
    if (!ref || !deletedIdSet.has(ref)) continue;

    const { ewtRef: _removed, ...withoutRef } = row.cells as IDatenN;
    row.cells = withoutRef as IDatenN;
    if (row._state === 'unchanged') {
      row._originalCells = { ...(withoutRef as IDatenN) };
    }
    tableChanged = true;
  }

  if (tableChanged && typeof nebenTable.drawRows === 'function') nebenTable.drawRows();
}

// ─── Öffentliche API ─────────────────────────────────────

/**
 * Auto-Save Verzögerung setzen (in ms).
 */
export function setAutoSaveDelay(ms: number): void {
  AUTO_SAVE_DELAY = ms;
}

/**
 * Aktuelle Verzögerung abfragen.
 */
export function getAutoSaveDelay(): number {
  return AUTO_SAVE_DELAY;
}

/**
 * Auto-Save global aktivieren/deaktivieren.
 */
export function setAutoSaveEnabled(enabled: boolean): void {
  autoSaveEnabled = enabled;
  if (!enabled) cancelAllPending();
}

/**
 * Ist Auto-Save aktiviert?
 */
export function isAutoSaveEnabled(): boolean {
  return autoSaveEnabled;
}

/**
 * Status-Listener registrieren (z.B. für UI-Badge).
 * Gibt Unsubscribe-Funktion zurück.
 */
export function onAutoSaveStatus(listener: StatusListener): () => void {
  statusListeners.push(listener);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx >= 0) statusListeners.splice(idx, 1);
  };
}

/**
 * Aktueller Status einer Ressource.
 */
export function getResourceStatus(resource: TResourceKey): ResourceState {
  return { ...resourceStates[resource] };
}

/**
 * Alle ausstehenden Timer abbrechen.
 * @param resetStatus - false wenn der Status nicht auf idle gesetzt werden soll
 *   (z.B. bei flushAll, wo saveResourceNow direkt danach saving setzt).
 */
export function cancelAllPending(resetStatus = true): void {
  for (const key of Object.keys(resourceStates) as TResourceKey[]) {
    const state = resourceStates[key];
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (resetStatus && state.status !== 'idle' && state.status !== 'saving') {
      setStatus(key, 'idle');
    }
  }
}

/**
 * Sofort alle ausstehenden Änderungen senden (z.B. beim manuellen Speichern).
 * Inklusive Löschungen.
 */
export async function flushAll(): Promise<void> {
  // resetStatus=false: pending-Status bleibt sichtbar bis saveResourceNow → saving setzt.
  cancelAllPending(false);
  const promises: Promise<void>[] = [];
  for (const key of ['BZ', 'BE', 'EWT', 'N'] as const) {
    if (hasPendingResourceChanges(key, true)) {
      promises.push(saveResourceNow(key, true));
    } else if (resourceStates[key].status === 'pending') {
      // Keine echten Änderungen (z.B. keine Tabelle im DOM) → direkt auf idle zurücksetzen.
      setStatus(key, 'idle');
    }
  }
  await Promise.allSettled(promises);
}

function hasPendingResourceChanges(resource: Exclude<TResourceKey, 'settings'>, includeDeletes = false): boolean {
  const table = findTable(TABLE_ID_MAP[resource]);
  if (!table) return false;
  const changes = table.rows.getChanges(includeDeletes);
  return changes.create.length > 0 || changes.update.length > 0 || changes.delete.length > 0;
}

/**
 * Externer Check für offene Änderungen einer Tabellen-Ressource.
 */
export function hasPendingTableChanges(resource: Exclude<TResourceKey, 'settings'>, includeDeletes = false): boolean {
  return hasPendingResourceChanges(resource, includeDeletes);
}

// ─── onChange-Handler (werden an CustomTable.onChange gebunden) ──

/**
 * Erstellt einen onChange-Handler für eine bestimmte Ressource.
 * Wird als `onChange` Option beim createCustomTable übergeben.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOnChangeHandler(resource: TResourceKey): (table: CustomTable<any>) => void {
  return () => {
    if (!autoSaveEnabled) return;
    scheduleAutoSave(resource);
  };
}

/**
 * Manuell eine Ressource zum Auto-Save vormerken.
 * Nützlich wenn Daten außerhalb der Tabelle geändert werden.
 */
export function scheduleAutoSave(resource: TResourceKey): void {
  if (!autoSaveEnabled) return;

  const state = resourceStates[resource];

  // Schutz: waehrend aktivem Save keine neuen Pending-Transitions starten.
  if (state.status === 'saving') return;

  // Tabellen-Ressourcen nur bei echten create/update-Änderungen vormerken.
  // So vermeiden wir Badge-Rebound durch reine Blur/Click-Nachläufer.
  if (resource !== 'settings') {
    const table = findTable(TABLE_ID_MAP[resource]);
    if (table) {
      const changes = table.rows.getChanges(false);
      const hasCreateOrUpdate = changes.create.length > 0 || changes.update.length > 0;
      if (!hasCreateOrUpdate) {
        // Stray Blur/Change nach Save: saved-Status visuell stabil lassen.
        if (state.status === 'saved') return;
        if (state.timer) {
          clearTimeout(state.timer);
          state.timer = null;
        }
        setStatus(resource, 'idle');
        return;
      }
    }
  }

  // Vorherigen Timer canceln
  if (state.timer) clearTimeout(state.timer);

  setStatus(resource, 'pending');

  // Offline? Timer nicht starten, bleibt als "pending" bis online-Event
  if (!navigator.onLine) {
    registerOnlineRetry();
    return;
  }

  state.timer = setTimeout(() => {
    state.timer = null;
    void saveResourceNow(resource);
  }, AUTO_SAVE_DELAY);
}

// ─── Eigentliche Save-Logik ──────────────────────────────

/**
 * Speichert sofort die Änderungen einer Ressource (ohne Löschungen).
 */
async function saveResourceNow(resource: TResourceKey, includeDeletes = false): Promise<void> {
  // Offline? Nicht senden, bleibt pending für online-Retry
  if (!navigator.onLine) {
    setStatus(resource, 'pending');
    registerOnlineRetry();
    return;
  }

  if (resource === 'settings') {
    await saveSettingsNow();
    return;
  }

  const table = findTable(TABLE_ID_MAP[resource]);
  if (!table) return;

  // Auto-Save: nur create/update. Löschungen nur bei manuellem Speichern.
  const changes: TableChanges<CustomTableTypes> = table.rows.getChanges(includeDeletes);

  // Nichts zu tun?
  if (changes.create.length === 0 && changes.update.length === 0 && changes.delete.length === 0) {
    setStatus(resource, 'idle');
    return;
  }

  setStatus(resource, 'saving');

  const monat = Storage.get<number>('Monat', { check: true });
  const jahr = Storage.get<number>('Jahr', { check: true });

  try {
    const result = await sendBulk(resource, table, changes, monat, jahr);

    // IDs aus der Response den neuen Zeilen zuweisen.
    // Primär über clientRequestId, mit Fallback auf Inhalts-Signaturen.
    const createdIdsByClient = mapCreatedIdsByClientRequestId(table, result.createdReferences ?? []);
    const createdIds =
      createdIdsByClient.size > 0 ? createdIdsByClient : mapCreatedIdsByContent(resource, table, result?.created ?? []);
    const rowErrorMatches = collectRowErrorMatches(table, result.errors);
    const failedRows = new Set(rowErrorMatches.map(entry => entry.row));

    if (includeDeletes) table.rows.commitChanges(createdIds, failedRows);
    else table.rows.commitAutoSave(createdIds, failedRows);

    // Nach erfolgreichem Save serverseitig normalisierte Felder in die Tabelle zurückspiegeln.
    applyServerRowsToTable(resource, table, result);

    // Fehlerhafte Einträge in der Tabelle markieren
    const errorRows = markErrorRows(table, rowErrorMatches, result.errors);

    if (resource === 'EWT' && includeDeletes && result.deleted.length > 0) {
      unlinkNebengeldRefsForDeletedEwtIds(result.deleted);
    }

    // localStorage aktualisieren
    updateLocalStorage(resource, table);
    aktualisiereBerechnung();

    // Wrapper-Timestamp mit Server-Zeit aktualisieren
    const allDocs = [...(result?.created ?? []), ...(result?.updated ?? [])];
    const maxUpdatedAt = allDocs.reduce<string | null>((max, doc: { updatedAt?: string }) => {
      if (!doc.updatedAt) return max;
      return !max || doc.updatedAt > max ? doc.updatedAt : max;
    }, null);
    if (maxUpdatedAt) {
      const storageKey = RESOURCE_STORAGE_MAP[resource];
      const currentData = Storage.get(storageKey, { check: true });
      Storage.setWithTimestamp(storageKey, currentData, dayjs(maxUpdatedAt).valueOf());
    }

    // Zeige Fehler-Dialog wenn Fehler vorhanden
    if (errorRows.length > 0) {
      showErrorDialog(resource, errorRows);
    }

    setStatus(resource, 'saved');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`AutoSave ${resource} fehlgeschlagen:`, msg);
    setStatus(resource, 'error', msg);

    createSnackBar({
      message: `Auto-Save (${resource}): ${msg}`,
      status: 'error',
      timeout: 5000,
      fixed: true,
    });
  }
}

/**
 * Einstellungen (UserProfile) speichern.
 */
async function saveSettingsNow(): Promise<void> {
  if (!navigator.onLine) {
    setStatus('settings', 'pending');
    registerOnlineRetry();
    return;
  }

  setStatus('settings', 'saving');

  try {
    const vorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
    const result = await profileApi.updateMyProfile(vorgabenU);
    if (result.updatedAt) {
      Storage.setWithTimestamp('VorgabenU', result.data, dayjs(result.updatedAt).valueOf());
    } else {
      Storage.set('VorgabenU', result.data);
    }
    setStatus('settings', 'saved');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AutoSave Einstellungen fehlgeschlagen:', msg);
    setStatus('settings', 'error', msg);

    createSnackBar({
      message: `Auto-Save (Einstellungen): ${msg}`,
      status: 'error',
      timeout: 5000,
      fixed: true,
    });
  }
}

/**
 * Sendet die Bulk-Operation an die passende API.
 */
async function sendBulk(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  changes: TableChanges<CustomTableTypes>,
  monat: number,
  jahr: number,
): Promise<{
  created: CustomTableTypes[];
  updated: CustomTableTypes[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: BulkErrorEntry[];
}> {
  type SavePeriod = { monat: number; jahr: number };

  const getPeriod = (item: CustomTableTypes): SavePeriod => {
    const fallback = { monat, jahr };

    switch (resource) {
      case 'BZ': {
        const parsed = dayjs(String((item as IDatenBZ).beginB));
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'BE': {
        const parsed = dayjs((item as IDatenBE).tagBE, 'DD.MM.YYYY', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'EWT': {
        const parsed = dayjs((item as IDatenEWT).tagE, 'YYYY-MM-DD', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'N': {
        const parsed = dayjs((item as IDatenN).tagN, 'DD.MM.YYYY', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
    }
  };

  const createItems = buildCreatePayloadWithClientRequestId(resource, table, changes.create);

  const createByPeriod = new Map<string, (CustomTableTypes & { clientRequestId: string })[]>();
  const updateByPeriod = new Map<string, (CustomTableTypes & { _id: string })[]>();
  const periods = new Map<string, SavePeriod>();

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
    created: CustomTableTypes[];
    updated: CustomTableTypes[];
    deleted: string[];
    createdReferences?: { _id: string; clientRequestId: string }[];
    errors: BulkErrorEntry[];
  } = { created: [], updated: [], deleted: [], createdReferences: [], errors: [] };

  const callBulk = async (period: SavePeriod, withDelete: boolean) => {
    const key = toPeriodKey(period);
    const bulk: BulkRequest = {
      create: createByPeriod.get(key) ?? [],
      update: updateByPeriod.get(key) ?? [],
      delete: withDelete ? changes.delete : [],
    };

    switch (resource) {
      case 'BZ':
        return bereitschaftszeitraumApi.bulk(
          bulk as { create: (IDatenBZ & { clientRequestId: string })[]; update: IDatenBZ[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'BE':
        return bereitschaftseinsatzApi.bulk(
          bulk as { create: (IDatenBE & { clientRequestId: string })[]; update: IDatenBE[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'EWT':
        return ewtApi.bulk(
          bulk as { create: (IDatenEWT & { clientRequestId: string })[]; update: IDatenEWT[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'N':
        return nebengeldApi.bulk(
          bulk as { create: (IDatenN & { clientRequestId: string })[]; update: IDatenN[]; delete: string[] },
          period.monat,
          period.jahr,
        );
    }
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

/**
 * Markiert fehlerhafte Rows in der Tabelle mit _state = 'error'.
 * Gibt Array der Fehler zurück für Dialog-Anzeige.
 */
function markErrorRows(
  table: CustomTable<CustomTableTypes>,
  rowErrorMatches: RowErrorMatch[],
  errors: BulkErrorEntry[],
): BulkErrorEntry[] {
  if (errors.length === 0) return [];

  for (const { row, error, sourceState } of rowErrorMatches) {
    row._state = 'error';
    row._errorState = sourceState;
    row._errorMessage = error.message;
  }

  // Tabelle neu zeichnen
  if (typeof table.drawRows === 'function') {
    table.drawRows();
  }

  return errors;
}

/**
 * Zeigt einen Dialog mit allen Fehler-Einträgen.
 */
function showErrorDialog(_resource: Exclude<TResourceKey, 'settings'>, errors: BulkErrorEntry[]): void {
  const errorList = errors
    .map((err, idx) => {
      const reference =
        err.operation === 'create'
          ? err.clientRequestId
            ? ` [clientRequestId: ${err.clientRequestId}]`
            : ''
          : err.id
            ? ` [_id: ${err.id}]`
            : '';
      return `${idx + 1}. ${err.operation}${reference}: ${err.message}`;
    })
    .join('\n');

  // Erstelle Dialog-Modal
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">Fehler beim Speichern</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p><strong>${errors.length} Fehler gefunden:</strong></p>
          <pre class="error-list" style="overflow-y: auto; max-height: 300px; border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">${escapeHtml(errorList)}</pre>
          <div class="alert alert-info mt-3 mb-0">
            <small>Die fehlerhaften Zeilen sind in der Tabelle gekennzeichnet und können erneut gespeichert werden.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const bootstrapApi = (window as { bootstrap?: { Modal?: new (element: Element) => { show: () => void } } }).bootstrap;
  if (!bootstrapApi?.Modal) {
    modal.remove();
    return;
  }

  const bsModal = new bootstrapApi.Modal(modal);
  bsModal.show();

  // Cleanup nach Schließen
  modal.addEventListener('hidden.bs.modal', () => {
    modal.remove();
  });
}

/**
 * Hilfsfunktion zum Escapen von HTML-Sonderzeichen.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * LocalStorage nach erfolgreichem Auto-Save aktualisieren.
 */
function updateLocalStorage(resource: Exclude<TResourceKey, 'settings'>, table: CustomTable<CustomTableTypes>): void {
  const storageKeyMap: Record<typeof resource, string> = {
    BZ: 'dataBZ',
    BE: 'dataBE',
    EWT: 'dataE',
    N: 'dataN',
  };

  const storageKey = storageKeyMap[resource] as TStorageData;
  const mergedRows = mergeVisibleResourceRows(resource, table);
  Storage.set(storageKey, mergedRows);
}

// ─── Online-Retry ────────────────────────────────────────

/**
 * Registriert einen einmaligen online-Event-Listener,
 * der alle pending Ressourcen nachspeichert, sobald die Verbindung wiederhergestellt ist.
 */
function registerOnlineRetry(): void {
  if (onlineListenerRegistered) return;
  onlineListenerRegistered = true;

  window.addEventListener(
    'online',
    () => {
      onlineListenerRegistered = false;
      console.log('[AutoSave] Wieder online – starte ausstehende Saves');
      for (const key of Object.keys(resourceStates) as TResourceKey[]) {
        if (resourceStates[key].status === 'pending') {
          scheduleAutoSave(key);
        }
      }
    },
    { once: true },
  );
}

/**
 * Markiert eine Ressource als gespeichert (für externes Speichern, z.B. saveDaten).
 */
export function markResourceSaved(resource: TResourceKey): void {
  setStatus(resource, 'saved');
}

/**
 * Setzt mehrere Ressourcen explizit auf idle (z. B. nach manuellem Speichern).
 */
export function markResourcesIdle(resources: TResourceKey[]): void {
  resources.forEach(resource => {
    const state = resourceStates[resource];
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    setStatus(resource, 'idle');
  });
}

/**
 * Setzt alle Ressourcen explizit auf idle (hard reset für manuelles Speichern).
 */
export function markAllResourcesIdle(): void {
  (Object.keys(resourceStates) as TResourceKey[]).forEach(resource => setStatus(resource, 'idle'));
}
