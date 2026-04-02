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
import type { CustomTable, CustomTableTypes, TableChanges } from '../class/CustomTable';
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
import { getMonatFromEWTBuchungstag } from './getMonatFromItem';

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

// ─── State ───────────────────────────────────────────────

const resourceStates: Record<TResourceKey, ResourceState> = {
  BZ: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  BE: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  EWT: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  N: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  settings: { timer: null, status: 'idle', lastSaved: null, lastError: null },
};

const statusListeners: StatusListener[] = [];

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
 */
export function cancelAllPending(): void {
  for (const key of Object.keys(resourceStates) as TResourceKey[]) {
    const state = resourceStates[key];
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.status === 'pending') setStatus(key, 'idle');
  }
}

/**
 * Sofort alle ausstehenden Änderungen senden (z.B. beim manuellen Speichern).
 * Inklusive Löschungen.
 */
export async function flushAll(): Promise<void> {
  cancelAllPending();
  const promises: Promise<void>[] = [];
  for (const key of ['BZ', 'BE', 'EWT', 'N'] as const) {
    if (hasPendingResourceChanges(key, true)) {
      promises.push(saveResourceNow(key, true));
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
    const result = await sendBulk(resource, changes, monat, jahr);

    // IDs aus der Response den neuen Zeilen zuweisen.
    // Primär über Inhalts-Signaturen, mit sicherem Fallback auf verbleibende IDs.
    const createdIds = mapCreatedIdsByContent(resource, table, result?.created ?? []);

    if (includeDeletes) table.rows.commitChanges(createdIds);
    else table.rows.commitAutoSave(createdIds);

    // Nach erfolgreichem Save serverseitig normalisierte Felder in die Tabelle zurückspiegeln.
    applyServerRowsToTable(resource, table, result);

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
      Storage.setWithTimestamp(storageKey, currentData, Date.parse(maxUpdatedAt));
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
      Storage.setWithTimestamp('VorgabenU', result.data, Date.parse(result.updatedAt));
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
  changes: TableChanges<CustomTableTypes>,
  monat: number,
  jahr: number,
): Promise<{
  created: CustomTableTypes[];
  updated: CustomTableTypes[];
  deleted: string[];
  errors: { operation: string; index: number; id?: string; message: string }[];
}> {
  const getMonth = (item: CustomTableTypes): number => {
    switch (resource) {
      case 'BZ':
        return dayjs(String((item as IDatenBZ).beginB)).month() + 1;
      case 'BE':
        return dayjs((item as IDatenBE).tagBE, 'DD.MM.YYYY').month() + 1;
      case 'EWT':
        return getMonatFromEWTBuchungstag(item as IDatenEWT);
      case 'N':
        return dayjs((item as IDatenN).tagN, 'DD.MM.YYYY').month() + 1;
    }
  };

  const createByMonth = new Map<number, CustomTableTypes[]>();
  const updateByMonth = new Map<number, (CustomTableTypes & { _id: string })[]>();

  for (const item of changes.create) {
    const m = getMonth(item);
    const arr = createByMonth.get(m) ?? [];
    arr.push(item);
    createByMonth.set(m, arr);
  }

  for (const item of changes.update as (CustomTableTypes & { _id: string })[]) {
    const m = getMonth(item);
    const arr = updateByMonth.get(m) ?? [];
    arr.push(item);
    updateByMonth.set(m, arr);
  }

  const months = Array.from(new Set([...createByMonth.keys(), ...updateByMonth.keys()]));
  const combined: {
    created: CustomTableTypes[];
    updated: CustomTableTypes[];
    deleted: string[];
    errors: { operation: string; index: number; id?: string; message: string }[];
  } = { created: [], updated: [], deleted: [], errors: [] };

  const callBulk = async (m: number, withDelete: boolean) => {
    const bulk: BulkRequest = {
      create: createByMonth.get(m) ?? [],
      update: updateByMonth.get(m) ?? [],
      delete: withDelete ? changes.delete : [],
    };

    switch (resource) {
      case 'BZ':
        return bereitschaftszeitraumApi.bulk(
          bulk as { create: IDatenBZ[]; update: IDatenBZ[]; delete: string[] },
          m,
          jahr,
        );
      case 'BE':
        return bereitschaftseinsatzApi.bulk(
          bulk as { create: IDatenBE[]; update: IDatenBE[]; delete: string[] },
          m,
          jahr,
        );
      case 'EWT':
        return ewtApi.bulk(bulk as { create: IDatenEWT[]; update: IDatenEWT[]; delete: string[] }, m, jahr);
      case 'N':
        return nebengeldApi.bulk(bulk as { create: IDatenN[]; update: IDatenN[]; delete: string[] }, m, jahr);
    }
  };

  if (months.length === 0) {
    const result = await callBulk(monat, true);
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    combined.errors.push(...result.errors);
    return combined;
  }

  let deleteSent = false;
  for (const m of months) {
    const result = await callBulk(m, !deleteSent);
    deleteSent = deleteSent || changes.delete.length > 0;
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    combined.errors.push(...result.errors);
  }

  return combined;
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

  // Aktive (nicht gelöschte) Zeilen der gesamten Tabelle im localStorage speichern.
  const activeRows = table.rows.array.filter(row => row._state !== 'deleted').map(row => row.cells);
  void resource;
  Storage.set(storageKey, activeRows);
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
