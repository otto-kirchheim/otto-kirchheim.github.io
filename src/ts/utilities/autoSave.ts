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
  IDatenBEJahr,
  IDatenBZ,
  IDatenBZJahr,
  IDatenEWT,
  IDatenEWTJahr,
  IDatenN,
  IDatenNJahr,
  IVorgabenU,
} from '../interfaces';
import {
  type BulkRequest,
  bereitschaftseinsatzApi,
  bereitschaftszeitraumApi,
  ewtApi,
  nebengeldApi,
  profileApi,
} from './apiService';
import Storage from './Storage';
import type { TStorageData } from './Storage';

// ─── Konfiguration ───────────────────────────────────────
/** Mapping von ResourceKey auf Storage-Key */
const RESOURCE_STORAGE_MAP: Record<Exclude<ResourceKey, 'settings'>, TStorageData> = {
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

type ResourceKey = 'BZ' | 'BE' | 'EWT' | 'N' | 'settings';

const TABLE_ID_MAP: Record<Exclude<ResourceKey, 'settings'>, string> = {
  BZ: 'tableBZ',
  BE: 'tableBE',
  EWT: 'tableE',
  N: 'tableN',
};

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface ResourceState {
  timer: ReturnType<typeof setTimeout> | null;
  status: SaveStatus;
  lastSaved: Date | null;
  lastError: string | null;
}

type StatusListener = (resource: ResourceKey, status: SaveStatus, error?: string) => void;

// ─── State ───────────────────────────────────────────────

const resourceStates: Record<ResourceKey, ResourceState> = {
  BZ: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  BE: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  EWT: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  N: { timer: null, status: 'idle', lastSaved: null, lastError: null },
  settings: { timer: null, status: 'idle', lastSaved: null, lastError: null },
};

const statusListeners: StatusListener[] = [];

// ─── Hilfsfunktionen ─────────────────────────────────────

function setStatus(resource: ResourceKey, status: SaveStatus, error?: string): void {
  const state = resourceStates[resource];
  state.status = status;
  if (status === 'saved') state.lastSaved = new Date();
  if (status === 'error') state.lastError = error ?? 'Unbekannter Fehler';
  statusListeners.forEach(fn => fn(resource, status, status === 'error' ? (state.lastError ?? undefined) : undefined));
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
export function getResourceStatus(resource: ResourceKey): ResourceState {
  return { ...resourceStates[resource] };
}

/**
 * Alle ausstehenden Timer abbrechen.
 */
export function cancelAllPending(): void {
  for (const key of Object.keys(resourceStates) as ResourceKey[]) {
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

function hasPendingResourceChanges(resource: Exclude<ResourceKey, 'settings'>, includeDeletes = false): boolean {
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
export function createOnChangeHandler(resource: ResourceKey): (table: CustomTable<any>) => void {
  return () => {
    if (!autoSaveEnabled) return;
    scheduleAutoSave(resource);
  };
}

/**
 * Manuell eine Ressource zum Auto-Save vormerken.
 * Nützlich wenn Daten außerhalb der Tabelle geändert werden.
 */
export function scheduleAutoSave(resource: ResourceKey): void {
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
async function saveResourceNow(resource: ResourceKey, includeDeletes = false): Promise<void> {
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

    // IDs aus der Response den neuen Zeilen zuweisen
    const createdIds = new Map<number, string>();
    if (result?.created) {
      result.created.forEach((doc: { _id?: string }, idx: number) => {
        if (doc._id) createdIds.set(idx, doc._id);
      });
    }

    if (includeDeletes) table.rows.commitChanges(createdIds);
    else table.rows.commitAutoSave(createdIds);

    // localStorage aktualisieren
    updateLocalStorage(resource, table, monat);
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
  resource: Exclude<ResourceKey, 'settings'>,
  changes: TableChanges<CustomTableTypes>,
  monat: number,
  jahr: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ created: any[]; updated: any[]; deleted: string[]; errors: any[] }> {
  const bulk: BulkRequest = {
    create: changes.create,
    update: changes.update as (CustomTableTypes & { _id: string })[],
    delete: changes.delete,
  };

  switch (resource) {
    case 'BZ':
      return bereitschaftszeitraumApi.bulk(
        bulk as { create: IDatenBZ[]; update: IDatenBZ[]; delete: string[] },
        monat,
        jahr,
      );
    case 'BE':
      return bereitschaftseinsatzApi.bulk(
        bulk as { create: IDatenBE[]; update: IDatenBE[]; delete: string[] },
        monat,
        jahr,
      );
    case 'EWT':
      return ewtApi.bulk(bulk as { create: IDatenEWT[]; update: IDatenEWT[]; delete: string[] }, monat, jahr);
    case 'N':
      return nebengeldApi.bulk(bulk as { create: IDatenN[]; update: IDatenN[]; delete: string[] }, monat, jahr);
  }
}

/**
 * LocalStorage nach erfolgreichem Auto-Save aktualisieren.
 */
function updateLocalStorage(
  resource: Exclude<ResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  monat: number,
): void {
  const storageKeyMap: Record<typeof resource, string> = {
    BZ: 'dataBZ',
    BE: 'dataBE',
    EWT: 'dataE',
    N: 'dataN',
  };

  const storageKey = storageKeyMap[resource] as TStorageData;
  type JahrData = IDatenBZJahr | IDatenBEJahr | IDatenEWTJahr | IDatenNJahr;
  const data = Storage.get<JahrData>(storageKey, { check: true });

  // Aktive (nicht gelöschte) Zeilen im localStorage speichern
  const activeRows = table.rows.array.filter(row => row._state !== 'deleted').map(row => row.cells);
  (data as Record<number, unknown[]>)[monat] = activeRows;

  Storage.set(storageKey, data);
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
      for (const key of Object.keys(resourceStates) as ResourceKey[]) {
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
export function markResourceSaved(resource: ResourceKey): void {
  setStatus(resource, 'saved');
}
