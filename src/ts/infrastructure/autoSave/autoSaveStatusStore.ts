/**
 * AutoSave-Status als `useSyncExternalStore`-kompatibler Modul-Store, analog
 * `buttonLoadingStore.ts`. Dockt an denselben Kanal an, den `autoSaveIndicator.ts` (Vanilla-DOM-
 * Vorgänger) nutzt (`onAutoSaveStatus` aus `autoSave.ts`), macht den Status aber deklarativ
 * abonnierbar statt per `classList`/`appendChild` direkt am Button zu manipulieren.
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

/** Priorität: error > blocked > saving > pending > saved > idle (wie `autoSaveIndicator.ts`). */
const PRIORITY: TSaveStatus[] = ['error', 'blocked', 'saving', 'pending', 'saved', 'idle'];

function worstStatus(resources: readonly TResourceKey[]): TSaveStatus {
  for (const prio of PRIORITY) {
    for (const res of resources) {
      if (statuses.get(res) === prio) return prio;
    }
  }
  return 'idle';
}

function computeSnapshot(resources: readonly TResourceKey[]): AutoSaveSnapshot {
  const status = worstStatus(resources);
  const errors = resources
    .filter(r => statuses.get(r) === 'error' && errorMessages.has(r))
    .map(r => errorMessages.get(r)!);
  return { status, errorMessages: errors, offline: !navigator.onLine };
}

function notify(): void {
  snapshotCache = new Map();
  for (const listener of listeners) listener();
}

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

export function subscribeAutoSaveStatus(listener: Listener): () => void {
  ensureWired();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

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
