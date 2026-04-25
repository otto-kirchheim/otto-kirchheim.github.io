/**
 * AutoSave-Manager: Automatisches Speichern pro Ressource nach Inaktivität.
 *
 * - Löschungen werden NICHT automatisch gesendet (nur beim manuellen Speichern)
 * - Erstellt/Geänderte Zeilen werden nach konfigurierbarer Inaktivitätszeit gespeichert
 * - Status-Anzeige per SnackBar + optionales Badge
 * - Einstellungen (UserProfile) werden ebenfalls automatisch gespeichert
 */

import { createSnackBar } from '../ui/CustomSnackbar';
import { publishEvent } from '../../core';
import { onEvent } from '../../core/events/appEvents';
import type { CustomTable, CustomTableTypes, TableChanges } from '../table/CustomTable';
import type { IVorgabenU, TResourceKey, TSaveStatus } from '../../interfaces';
import { profileApi } from '../api/apiService';
import Storage from '../storage/Storage';
import type { TStorageData } from '../storage/Storage';
import dayjs from '../date/configDayjs';
import mergeVisibleResourceRows from '../data/mergeVisibleResourceRows';
import { RESOURCE_STORAGE_MAP, RESOURCE_TABLE_ID_MAP } from '../data/resourceConfig';
import { mapCreatedIdsByClientRequestId, mapCreatedIdsByContent } from './changeTracking';
import {
  applyServerRowsToTable,
  collectRowErrorMatches,
  findTable,
  sendBulk,
  unlinkNebengeldRefsForDeletedEwtIds,
} from './savePipeline';
import { markErrorRows, showErrorDialog } from './errorHandling';

// ─── Konfiguration ───────────────────────────────────────

/** Auto-Save Verzögerung in Millisekunden (Standard: 10 Sekunden) */
let AUTO_SAVE_DELAY = 10000;

/** Auto-Save global aktiviert? */
let autoSaveEnabled = true;

/** online-Event Listener registriert? */
let onlineListenerRegistered = false;

// ─── Typen ───────────────────────────────────────────────

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

function updateLocalStorage(resource: Exclude<TResourceKey, 'settings'>, table: CustomTable<CustomTableTypes>): void {
  const storageKey: TStorageData = RESOURCE_STORAGE_MAP[resource];
  const mergedRows = mergeVisibleResourceRows(resource, table);
  Storage.set(storageKey, mergedRows);
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
  cancelAllPending(false);
  const promises: Promise<void>[] = [];
  for (const key of ['BZ', 'BE', 'EWT', 'N'] as const) {
    if (hasPendingResourceChanges(key, true)) {
      promises.push(saveResourceNow(key, true));
    } else if (resourceStates[key].status === 'pending') {
      setStatus(key, 'idle');
    }
  }
  await Promise.allSettled(promises);
}

function hasPendingResourceChanges(resource: Exclude<TResourceKey, 'settings'>, includeDeletes = false): boolean {
  const table = findTable(RESOURCE_TABLE_ID_MAP[resource]);
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

// ─── Event-Driven AutoSave ──────────────────────────────

/**
 * Registriert den AutoSave-Listener auf das typed Event-System.
 * Muss einmal beim App-Start aufgerufen werden, bevor Features Events feuern.
 */
export function initAutoSaveEventListener(): void {
  onEvent('data:changed', ({ resource }) => {
    if (resource === 'all') {
      for (const key of ['BZ', 'BE', 'EWT', 'N'] as const) {
        scheduleAutoSave(key);
      }
    } else if (resource !== 'settings') {
      scheduleAutoSave(resource);
    }
  });
}

// ─── onChange-Handler (werden an CustomTable.onChange gebunden) ──

/**
 * Erstellt einen onChange-Handler für eine bestimmte Ressource.
 * Wird als `onChange` Option beim createCustomTable übergeben.
 * Publiziert ein 'data:changed' Event — AutoSave reagiert via initAutoSaveEventListener.
 */
export function createOnChangeHandler<T extends CustomTableTypes>(
  resource: TResourceKey,
): (table: CustomTable<T>) => void {
  return () => {
    if (!autoSaveEnabled) return;
    publishEvent('data:changed', { resource, action: 'update' });
  };
}

/**
 * Manuell eine Ressource zum Auto-Save vormerken.
 * Nützlich wenn Daten außerhalb der Tabelle geändert werden.
 */
export function scheduleAutoSave(resource: TResourceKey): void {
  if (!autoSaveEnabled) return;

  const state = resourceStates[resource];

  if (state.status === 'saving') return;

  if (resource !== 'settings') {
    const table = findTable(RESOURCE_TABLE_ID_MAP[resource]);
    if (table) {
      const changes = table.rows.getChanges(false);
      const hasCreateOrUpdate = changes.create.length > 0 || changes.update.length > 0;
      if (!hasCreateOrUpdate) {
        if (state.timer) {
          clearTimeout(state.timer);
          state.timer = null;
        }
        // Always sync localStorage even when no backend call is needed — e.g. after undo-delete
        // restores an 'unchanged' row that was absent from storage due to a prior auto-save while deleted.
        updateLocalStorage(resource, table);
        setStatus(resource, 'idle');
        return;
      }
    }
  }

  if (state.timer) clearTimeout(state.timer);

  setStatus(resource, 'pending');

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

async function saveResourceNow(resource: TResourceKey, includeDeletes = false): Promise<void> {
  if (!navigator.onLine) {
    setStatus(resource, 'pending');
    registerOnlineRetry();
    return;
  }

  if (resource === 'settings') {
    await saveSettingsNow();
    return;
  }

  const table = findTable(RESOURCE_TABLE_ID_MAP[resource]);
  if (!table) return;

  const changes: TableChanges<CustomTableTypes> = table.rows.getChanges(includeDeletes);

  if (changes.create.length === 0 && changes.update.length === 0 && changes.delete.length === 0) {
    setStatus(resource, 'idle');
    return;
  }

  setStatus(resource, 'saving');

  const monat = Storage.get<number>('Monat', { check: true });
  const jahr = Storage.get<number>('Jahr', { check: true });

  try {
    const result = await sendBulk(resource, table, changes, monat, jahr);

    const createdIdsByClient = mapCreatedIdsByClientRequestId(table, result.createdReferences ?? []);
    const createdIds =
      createdIdsByClient.size > 0 ? createdIdsByClient : mapCreatedIdsByContent(resource, table, result?.created ?? []);
    const rowErrorMatches = collectRowErrorMatches(table, result.errors);
    const failedRows = new Set(rowErrorMatches.map(entry => entry.row));

    if (includeDeletes) table.rows.commitChanges(createdIds, failedRows);
    else table.rows.commitAutoSave(createdIds, failedRows);

    applyServerRowsToTable(resource, table, result);

    const errorRows = markErrorRows(table, rowErrorMatches, result.errors);

    if (resource === 'EWT' && includeDeletes && result.deleted.length > 0) {
      unlinkNebengeldRefsForDeletedEwtIds(result.deleted);
    }

    updateLocalStorage(resource, table);
    publishEvent('data:changed', { resource, action: 'update' });

    const allDocs = [...(result?.created ?? []), ...(result?.updated ?? [])];
    const maxUpdatedAt = allDocs.reduce<string | null>((max, doc) => {
      const d = doc as { updatedAt?: string };
      if (!d.updatedAt) return max;
      return !max || d.updatedAt > max ? d.updatedAt : max;
    }, null);
    if (maxUpdatedAt) {
      const storageKey = RESOURCE_STORAGE_MAP[resource];
      const currentData = Storage.get(storageKey, { check: true });
      Storage.setWithTimestamp(storageKey, currentData, dayjs(maxUpdatedAt).valueOf());
    }

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

// ─── Online-Retry ────────────────────────────────────────

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
