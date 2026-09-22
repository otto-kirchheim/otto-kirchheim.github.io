/**
 * AutoSave-Manager: speichert je Ressource nach Inaktivität.
 *
 * - Löschungen werden NICHT automatisch gesendet (nur beim manuellen Speichern)
 * - Neue/geänderte Zeilen werden nach der konfigurierten Inaktivitätszeit gespeichert
 * - Status per `AutoSaveBadge` (Tooltip zeigt Fehlermeldungen)
 * - Einstellungen (UserProfile) werden ebenfalls automatisch gespeichert
 */

import { publishEvent } from '@/core';
import { onEvent } from '@/shared/lib/events/appEvents';
import type { CustomTable, CustomTableTypes, TableChanges } from '../table/CustomTable';
import { getRowKey } from '../table/CustomTable';
import type { IVorgabenU, TResourceKey, TSaveStatus } from '@/types';
import { profileApi } from '@/shared/api/apiService';
import Storage from '../../shared/lib/storage/Storage';
import type { TStorageData } from '../../shared/lib/storage/Storage';
import dayjs from '@/shared/lib/date/configDayjs';
import mergeVisibleResourceRows from '../data/mergeVisibleResourceRows';
import { resourceKeys, storageKeyOf, tableIdOf } from '../data/resourceConfig';
import { mapCreatedIdsByClientRequestId, mapCreatedIdsByContent } from './changeTracking';
import { applyServerRowsToTable, collectRowErrorMatches, findTable, sendBulk } from './savePipeline';
import {
  buildRowLabel,
  markErrorRows,
  markFetchErrorRows,
  markOverlapBlockedRows,
  showErrorDialog,
} from './errorHandling';
import { findOverlapBlockedRows } from './overlapGuard';
import type { BulkErrorEntry } from '@/shared/api/apiFetchHelper';

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
  lastSaved: number | null;
  lastError: string | null;
  queuedDuringSave: boolean;
  skipNextSavingSchedule: boolean;
}

type StatusListener = (resource: TResourceKey, status: TSaveStatus, error?: string) => void;

// ─── State ───────────────────────────────────────────────

const resourceStates: Record<TResourceKey, ResourceState> = {
  BZ: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
  BE: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
  EWT: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
  N: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
  EA: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
  settings: {
    timer: null,
    status: 'idle',
    lastSaved: null,
    lastError: null,
    queuedDuringSave: false,
    skipNextSavingSchedule: false,
  },
};

const statusListeners: StatusListener[] = [];

// ─── Hilfsfunktionen ─────────────────────────────────────

/**
 * Setzt den Status einer Ressource und benachrichtigt die Status-Listener.
 *
 * @param resource - Betroffene Ressource.
 * @param status - Neuer Status.
 * @param error - Fehlermeldung (nur bei `error`).
 */
function setStatus(resource: TResourceKey, status: TSaveStatus, error?: string): void {
  const state = resourceStates[resource];
  state.status = status;
  if (status === 'saved') state.lastSaved = Date.now();
  if (status === 'error') state.lastError = error ?? 'Unbekannter Fehler';
  statusListeners.forEach(fn => fn(resource, status, status === 'error' ? (state.lastError ?? undefined) : undefined));
}

/**
 * Schreibt die sichtbaren Zeilen (mit dem Rest aus dem Storage gemergt) zurück in den localStorage.
 *
 * @param resource - Tabellen-Ressource.
 * @param table - Zugehörige Tabelle.
 */
function updateLocalStorage(resource: Exclude<TResourceKey, 'settings'>, table: CustomTable<CustomTableTypes>): void {
  const storageKey: TStorageData = storageKeyOf(resource);
  const mergedRows = mergeVisibleResourceRows(resource, table);
  Storage.set(storageKey, mergedRows);
}

// ─── Öffentliche API ─────────────────────────────────────

/**
 * Setzt die AutoSave-Verzögerung.
 *
 * @param ms - Verzögerung in Millisekunden.
 */
export function setAutoSaveDelay(ms: number): void {
  AUTO_SAVE_DELAY = ms;
}

/**
 * Aktuelle AutoSave-Verzögerung.
 *
 * @returns Verzögerung in Millisekunden.
 */
export function getAutoSaveDelay(): number {
  return AUTO_SAVE_DELAY;
}

/**
 * Aktiviert/deaktiviert AutoSave global.
 *
 * @param enabled - `true` = AutoSave aktiv.
 */
export function setAutoSaveEnabled(enabled: boolean): void {
  autoSaveEnabled = enabled;
  if (!enabled) cancelAllPending();
}

/**
 * Ist AutoSave aktiviert?
 *
 * @returns `true`, wenn AutoSave aktiv ist.
 */
export function isAutoSaveEnabled(): boolean {
  return autoSaveEnabled;
}

/**
 * Übernimmt `enabled`/`delay` aus dem Benutzerprofil in den Runtime-State. Genutzt beim App-Start
 * (`Einstellungen/index.ts`) und direkt nach dem Speichern der Einstellungen (`saveDaten.ts`), damit
 * eine Änderung sofort greift.
 *
 * @param settings - `autoSaveEnabled`/`autoSaveDelayMs` aus dem Profil; fehlende Felder bleiben unverändert.
 */
export function applyAutoSaveSettings(settings?: { autoSaveEnabled?: boolean; autoSaveDelayMs?: number }): void {
  if (settings?.autoSaveEnabled !== undefined) setAutoSaveEnabled(settings.autoSaveEnabled);
  if (settings?.autoSaveDelayMs !== undefined) setAutoSaveDelay(settings.autoSaveDelayMs);
}

/**
 * Status-Listener registrieren (z.B. für das Badge). Gibt die Unsubscribe-Funktion zurück.
 *
 * @param listener - Wird bei jeder Statusänderung mit Ressource, Status und Fehlermeldung aufgerufen.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function onAutoSaveStatus(listener: StatusListener): () => void {
  statusListeners.push(listener);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx >= 0) statusListeners.splice(idx, 1);
  };
}

/**
 * Aktueller Zustand einer Ressource.
 *
 * @param resource - Ressource.
 * @returns Kopie des Zustands (Status, letzter Speicherzeitpunkt, letzter Fehler).
 */
export function getResourceStatus(resource: TResourceKey): ResourceState {
  return { ...resourceStates[resource] };
}

/**
 * Bricht alle ausstehenden Timer ab. `resetStatus = false` lässt den Status stehen (flushAll: danach
 * setzt `saveResourceNow` direkt `saving`).
 *
 * @param resetStatus - `false` lässt den Status unverändert.
 */
export function cancelAllPending(resetStatus = true): void {
  for (const key of Object.keys(resourceStates) as TResourceKey[]) {
    const state = resourceStates[key];
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    state.queuedDuringSave = false;
    state.skipNextSavingSchedule = false;
    if (resetStatus && state.status !== 'idle' && state.status !== 'saving') {
      setStatus(key, 'idle');
    }
  }
}

/**
 * Sendet sofort alle ausstehenden Änderungen inklusive Löschungen (manuelles Speichern).
 *
 * @returns Promise, das nach allen Speichervorgängen erfüllt wird (Fehler einzelner Ressourcen brechen nicht ab).
 */
export async function flushAll(): Promise<void> {
  cancelAllPending(false);
  const promises: Promise<void>[] = [];
  for (const key of resourceKeys()) {
    if (hasPendingResourceChanges(key, true)) {
      promises.push(saveResourceNow(key, true));
    } else if (resourceStates[key].status === 'pending') {
      setStatus(key, 'idle');
    }
  }
  await Promise.allSettled(promises);
}

/**
 * Gibt es ungespeicherte Änderungen an der Tabelle der Ressource?
 *
 * @param resource - Tabellen-Ressource.
 * @param includeDeletes - Gelöschte Zeilen mitzählen.
 * @returns `true`, wenn es Neues, Geändertes (oder Gelöschtes) gibt.
 */
function hasPendingResourceChanges(resource: Exclude<TResourceKey, 'settings'>, includeDeletes = false): boolean {
  const table = findTable(tableIdOf(resource));
  if (!table) return false;
  const changes = table.rows.getChanges(includeDeletes);
  return changes.create.length > 0 || changes.update.length > 0 || changes.delete.length > 0;
}

/**
 * Offene Änderungen einer Tabellen-Ressource (externer Check).
 *
 * @param resource - Tabellen-Ressource.
 * @param includeDeletes - Gelöschte Zeilen mitzählen.
 * @returns `true`, wenn es ungespeicherte Änderungen gibt.
 */
export function hasPendingTableChanges(resource: Exclude<TResourceKey, 'settings'>, includeDeletes = false): boolean {
  return hasPendingResourceChanges(resource, includeDeletes);
}

// ─── Event-Driven AutoSave ──────────────────────────────

/**
 * Registriert den AutoSave-Listener am Event-System; einmal beim App-Start, bevor Features Events feuern.
 */
export function initAutoSaveEventListener(): void {
  onEvent('data:changed', ({ resource }) => {
    if (resource === 'all') {
      for (const key of resourceKeys()) {
        scheduleAutoSave(key);
      }
    } else if (resource !== 'settings') {
      scheduleAutoSave(resource);
    }
  });
}

// ─── onChange-Handler (werden an CustomTable.onChange gebunden) ──

/**
 * Erstellt den `onChange`-Handler einer Ressource für `createCustomTable`. Publiziert `data:changed`,
 * worauf `initAutoSaveEventListener` reagiert.
 *
 * @param resource - Ressource der Tabelle.
 * @returns `onChange`-Handler; ohne aktives AutoSave ein No-Op.
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
 * Merkt eine Ressource für AutoSave vor -- für Änderungen außerhalb der Tabelle.
 *
 * @param resource - Vorzumerkende Ressource.
 */
export function scheduleAutoSave(resource: TResourceKey): void {
  if (!autoSaveEnabled) return;

  const state = resourceStates[resource];

  if (state.status === 'saving') {
    if (state.skipNextSavingSchedule) {
      state.skipNextSavingSchedule = false;
      return;
    }
    state.queuedDuringSave = true;
    return;
  }

  if (resource !== 'settings') {
    const table = findTable(tableIdOf(resource));
    if (table) {
      const changes = table.rows.getChanges(false);
      const hasCreateOrUpdate = changes.create.length > 0 || changes.update.length > 0;
      if (!hasCreateOrUpdate) {
        if (state.timer) {
          clearTimeout(state.timer);
          state.timer = null;
        }
        // localStorage immer abgleichen, auch ohne Backend-Aufruf: nach Undo-Delete fehlt die wiederhergestellte
        // 'unchanged'-Zeile sonst im Storage (ein AutoSave lief, während sie gelöscht war).
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

/**
 * Speichert eine Ressource sofort, inklusive Löschungen (manuelles Speichern).
 *
 * @param resource - Zu speichernde Ressource.
 * @returns Promise, das nach dem Speichern erfüllt wird.
 */
export async function flushResource(resource: TResourceKey): Promise<void> {
  await saveResourceNow(resource, true);
}

/**
 * Sendet die anstehenden Änderungen einer Ressource und übernimmt die Antwort. Offline: `pending` mit Online-Retry; Überlappung mit ungesyncter Löschung: `blocked`. Änderungen während des Requests (`queuedDuringSave`) löst ein Folgelauf aus.
 *
 * @param resource - Zu speichernde Ressource.
 * @param includeDeletes - Löschungen mitsenden (nur manuelles Speichern).
 * @returns Promise, das nach Abschluss erfüllt wird; Fehler landen im Status.
 */
async function saveResourceNow(resource: TResourceKey, includeDeletes = false): Promise<void> {
  const state = resourceStates[resource];

  if (!navigator.onLine) {
    setStatus(resource, 'pending');
    registerOnlineRetry();
    return;
  }

  if (resource === 'settings') {
    await saveSettingsNow();
    return;
  }

  const table = findTable(tableIdOf(resource));
  if (!table) return;

  // AutoSave sendet keine Löschungen. Überschneidet sich eine Neuanlage/Änderung mit einer noch nicht
  // synchronisierten Löschung derselben Ressource, lehnt der Server sie ab (BZ/EWT `ensureNoOverlap` sieht
  // den alten Datensatz). Daher: Ressource zurückhalten, betroffene Zeilen markieren und auf manuelles
  // Speichern verweisen (Delete+Create zusammen, der Server löscht zuerst -- `base.controller.ts`).
  if (!includeDeletes) {
    const blockedRows = findOverlapBlockedRows(resource, table);
    if (blockedRows.length > 0) {
      markOverlapBlockedRows(table, blockedRows);
      setStatus(resource, 'blocked');
      return;
    }
  }

  const changes: TableChanges<CustomTableTypes> = table.rows.getChanges(includeDeletes);

  if (changes.create.length === 0 && changes.update.length === 0 && changes.delete.length === 0) {
    setStatus(resource, 'idle');
    return;
  }

  // Row-Snapshot VOR dem Request legt fest, welche Zeilen zu diesem Lauf gehören. Was währenddessen neu
  // entsteht oder sich ändert, bleibt beim Commit unangetastet (AutoSave-Commit-Race) und wird über
  // `queuedDuringSave` im nächsten Lauf nachgeholt.
  const changeRows = table.rows.getChangeRows(includeDeletes);
  const includedRows = new Set([...changeRows.create, ...changeRows.update, ...changeRows.delete].map(getRowKey));

  setStatus(resource, 'saving');

  const monat = Storage.get<number>('Monat', { check: true });
  const jahr = Storage.get<number>('Jahr', { check: true });

  try {
    const result = await sendBulk(resource, table, changes, monat, jahr);

    const createdIdsByClient = mapCreatedIdsByClientRequestId(changeRows.create, result.createdReferences ?? []);
    const createdIds =
      createdIdsByClient.size > 0
        ? createdIdsByClient
        : mapCreatedIdsByContent(resource, changeRows.create, result?.created ?? []);
    const rowErrorMatches = collectRowErrorMatches(
      changeRows.create,
      changeRows.update,
      changeRows.delete,
      result.errors,
    );
    const failedRows = new Set(rowErrorMatches.map(entry => getRowKey(entry.row)));

    if (includeDeletes) table.rows.commitChanges(createdIds, failedRows, includedRows);
    else table.rows.commitAutoSave(createdIds, failedRows, includedRows);

    applyServerRowsToTable(resource, table, result);

    markErrorRows(table, rowErrorMatches, result.errors);

    // Fehler ohne Zeilennummer (keine clientRequestId/id): nur die Zeilen dieses Laufs als Fehler markieren,
    // nicht den ganzen Live-Zustand (AutoSave-Commit-Race).
    if (result.errors.length > 0 && rowErrorMatches.length === 0) {
      const uncommitted = [...changeRows.create, ...changeRows.update].filter(r => r._state !== 'unchanged');
      const msg = result.errors.map(e => e.message).join(' · ');
      uncommitted.forEach(row => {
        row._errorState = row._state === 'new' ? 'new' : 'modified';
        row._state = 'error';
        row._errorMessage = msg;
      });
      if (uncommitted.length > 0 && typeof table.drawRows === 'function') table.drawRows();
    }

    // Verknuepfte Features (EZ, EA) loesen ihre EWT-Verweise auf die geloeschten Ids, auch ohne gemounteten Tab.
    if (resource === 'EWT' && includeDeletes && result.deleted.length > 0) {
      publishEvent('ewt:deleted', { ids: result.deleted });
    }

    updateLocalStorage(resource, table);
    state.skipNextSavingSchedule = true;
    publishEvent('data:changed', { resource, action: 'update' });

    const allDocs = [...(result?.created ?? []), ...(result?.updated ?? [])];
    const maxUpdatedAt = allDocs.reduce<string | null>((max, doc) => {
      const d = doc as { updatedAt?: string };
      if (!d.updatedAt) return max;
      return !max || d.updatedAt > max ? d.updatedAt : max;
    }, null);
    if (maxUpdatedAt) {
      const storageKey = storageKeyOf(resource);
      const currentData = Storage.get(storageKey, { check: true });
      Storage.setWithTimestamp(storageKey, currentData, dayjs(maxUpdatedAt).valueOf());
    }

    if (result.errors.length > 0) {
      const errorRows = table.rows.array.filter(r => r._state === 'error');
      showErrorDialog(
        resource,
        rowErrorMatches.length > 0
          ? rowErrorMatches.map(({ row, error }) => ({ ...error, label: buildRowLabel(row) }))
          : result.errors.map((error, i) => ({
              ...error,
              label: errorRows[i] ? buildRowLabel(errorRows[i]) : undefined,
            })),
      );
    }

    setStatus(resource, 'saved');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`AutoSave ${resource} fehlgeschlagen:`, msg);
    setStatus(resource, 'error', msg);

    markFetchErrorRows(table, changeRows, msg);
    updateLocalStorage(resource, table);

    const operation: BulkErrorEntry['operation'] =
      changes.create.length > 0 ? 'create' : changes.update.length > 0 ? 'update' : 'delete';
    const errorItems = table.rows.array
      .filter(r => r._state === 'error')
      .map(r => ({ operation, message: msg, label: buildRowLabel(r) }));
    showErrorDialog(resource, errorItems.length > 0 ? errorItems : [{ operation, message: msg }]);
  } finally {
    const hasQueuedChanges = state.queuedDuringSave;
    state.queuedDuringSave = false;
    if (hasQueuedChanges) {
      void saveResourceNow(resource, includeDeletes);
    }
  }
}

/**
 * Speichert das Benutzerprofil (`VorgabenU`) und übernimmt die Serverantwort.
 *
 * @returns Promise, das nach Abschluss erfüllt wird; Fehler landen im Status.
 */
async function saveSettingsNow(): Promise<void> {
  const state = resourceStates.settings;

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
    // Kein Snackbar: `setStatus('error', msg)` treibt den Tooltip von `AutoSaveBadge` mit derselben
    // Meldung -- wie bei allen Ressourcen (Tabellen zusätzlich `showErrorDialog`).
    setStatus('settings', 'error', msg);
  } finally {
    const hasQueuedChanges = state.queuedDuringSave;
    state.queuedDuringSave = false;
    if (hasQueuedChanges) {
      void saveSettingsNow();
    }
  }
}

// ─── Online-Retry ────────────────────────────────────────

/**
 * Plant beim nächsten `online`-Event einen AutoSave für alle Ressourcen mit Status `pending` (einmalig registriert).
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
 * Markiert eine Ressource als gespeichert (externes Speichern, z.B. `saveDaten`).
 *
 * @param resource - Gespeicherte Ressource.
 */
export function markResourceSaved(resource: TResourceKey): void {
  setStatus(resource, 'saved');
}

/**
 * Setzt mehrere Ressourcen auf idle (nach manuellem Speichern).
 *
 * @param resources - Ressourcen, deren Timer und Status zurückgesetzt werden.
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
 * Setzt alle Ressourcen auf idle (Hard-Reset nach manuellem Speichern).
 */
export function markAllResourcesIdle(): void {
  (Object.keys(resourceStates) as TResourceKey[]).forEach(resource => setStatus(resource, 'idle'));
}
