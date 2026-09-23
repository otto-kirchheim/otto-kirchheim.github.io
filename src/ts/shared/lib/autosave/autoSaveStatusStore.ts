/**
 * AutoSave-Status als `useSyncExternalStore`-kompatibler Modul-Store (analog `buttonLoadingStore.ts`), gespeist aus `onAutoSaveStatus` (`autoSave.ts`).
 *
 * Ein Snapshot-Cache ist nötig, weil `getAutoSaveSnapshot` ein zusammengesetztes Objekt
 * zurückgibt (Status + Fehlermeldungen mehrerer Ressourcen) -- ohne stabile Referenz zwischen
 * echten Änderungen würde React "The result of getSnapshot should be cached" warnen.
 */

import { onAutoSaveStatus } from './autoSave';
import type { TResourceKey, TSaveStatus } from '@/types';

type Listener = () => void;

export type AutoSaveSnapshot = {
  status: TSaveStatus;
  errorMessages: string[];
  offline: boolean;
};

const IDLE_SNAPSHOT: AutoSaveSnapshot = { status: 'idle', errorMessages: [], offline: false };

const statuses = new Map<TResourceKey, TSaveStatus>();
const errorMessages = new Map<TResourceKey, string>();
const listeners = new Set<Listener>();

let snapshotCache = new Map<string, AutoSaveSnapshot>();
let unsubscribeCore: (() => void) | null = null;
let onlineOfflineHandler: (() => void) | null = null;

/** Priorität: error > blocked > saving > pending > saved > idle. */
const PRIORITY: TSaveStatus[] = ['error', 'blocked', 'saving', 'pending', 'saved', 'idle'];

/**
 * Ermittelt den Status mit der höchsten Priorität unter den angegebenen Ressourcen.
 *
 * @param resources - Zu berücksichtigende Ressourcen.
 * @returns Schlimmster Status laut `PRIORITY`; `idle`, wenn keine Ressource einen Status hat.
 */
function worstStatus(resources: readonly TResourceKey[]): TSaveStatus {
  for (const prio of PRIORITY) {
    for (const res of resources) {
      if (statuses.get(res) === prio) return prio;
    }
  }
  return 'idle';
}

/**
 * Baut den Snapshot aus dem schlimmsten Status, den Fehlermeldungen der Ressourcen im Status `error` und dem Online-Zustand.
 *
 * @param resources - Zu berücksichtigende Ressourcen.
 * @returns Neuer Snapshot.
 */
function computeSnapshot(resources: readonly TResourceKey[]): AutoSaveSnapshot {
  const status = worstStatus(resources);
  const errors = resources
    .filter(r => statuses.get(r) === 'error' && errorMessages.has(r))
    .map(r => errorMessages.get(r)!);
  return { status, errorMessages: errors, offline: !navigator.onLine };
}

/**
 * Verwirft den Snapshot-Cache und benachrichtigt alle Abonnenten.
 */
function notify(): void {
  snapshotCache = new Map();
  for (const listener of listeners) listener();
}

/**
 * Verbindet den Store beim ersten Abonnenten mit `onAutoSaveStatus` und den Browser-Events `online`/`offline`; danach wirkungslos.
 */
function ensureWired(): void {
  if (unsubscribeCore) return;

  unsubscribeCore = onAutoSaveStatus((resource, status, error) => {
    statuses.set(resource, status);
    if (status === 'error' && error) errorMessages.set(resource, error);
    else if (status !== 'error') errorMessages.delete(resource);
    notify();
  });

  onlineOfflineHandler = () => notify();
  window.addEventListener('online', onlineOfflineHandler);
  window.addEventListener('offline', onlineOfflineHandler);
}

/**
 * Meldet einen Abonnenten an und verdrahtet den Store bei Bedarf (`subscribe`-Argument für `useSyncExternalStore`).
 *
 * @param listener - Wird bei jeder Änderung des Status oder des Online-Zustands aufgerufen.
 * @returns Funktion zum Abmelden.
 */
export function subscribeAutoSaveStatus(listener: Listener): () => void {
  ensureWired();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Liefert den Snapshot für die Ressourcen; solange sich nichts ändert, immer dieselbe Referenz.
 *
 * @param resources - Zu berücksichtigende Ressourcen; leer ergibt den konstanten Leerlauf-Snapshot.
 * @returns Status, Fehlermeldungen und Offline-Flag.
 */
export function getAutoSaveSnapshot(resources: readonly TResourceKey[]): AutoSaveSnapshot {
  if (resources.length === 0) return IDLE_SNAPSHOT;

  const key = resources.join(',');
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const snapshot = computeSnapshot(resources);
  snapshotCache.set(key, snapshot);
  return snapshot;
}

/** Für Tests: Store auf Ausgangszustand zurücksetzen. */
export function resetAutoSaveStatusStore(): void {
  if (unsubscribeCore) {
    unsubscribeCore();
    unsubscribeCore = null;
  }
  if (onlineOfflineHandler) {
    window.removeEventListener('online', onlineOfflineHandler);
    window.removeEventListener('offline', onlineOfflineHandler);
    onlineOfflineHandler = null;
  }
  statuses.clear();
  errorMessages.clear();
  listeners.clear();
  snapshotCache = new Map();
}
