import { useSyncExternalStore } from 'react';

/**
 * Verifizierungsstatus der E-Mail-Adresse als `useSyncExternalStore`-kompatibler Modul-Store
 * (Muster wie `activeTabStore.ts`). `Einstellungen/index.ts` schreibt hierher; das E-Mail-Feld
 * in `PersoenlicheDatenPanel.tsx` zeigt ihn als `message`/`messageIcon` direkt am Feld.
 */

export type EmailStatus = { text: string; icon: string } | null;

type Listener = () => void;

let status: EmailStatus = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): EmailStatus {
  return status;
}

export function setEmailStatus(next: EmailStatus): void {
  if (next?.text === status?.text && next?.icon === status?.icon) return;
  status = next;
  for (const listener of listeners) listener();
}

export function useEmailStatus(): EmailStatus {
  return useSyncExternalStore(subscribe, getSnapshot);
}
