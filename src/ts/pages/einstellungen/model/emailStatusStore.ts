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

/**
 * Meldet einen Listener am Store an (für `useSyncExternalStore`).
 *
 * @param listener - Wird bei jeder Statusänderung aufgerufen.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Liefert den aktuellen Status (für `useSyncExternalStore`).
 *
 * @returns Aktueller Status.
 */
function getSnapshot(): EmailStatus {
  return status;
}

/**
 * Setzt den Status und benachrichtigt die Listener, aber nur bei geänderter Anzeige.
 *
 * @param next - Neuer Status; `null` blendet ihn aus.
 */
export function setEmailStatus(next: EmailStatus): void {
  if (next?.text === status?.text && next?.icon === status?.icon) return;
  status = next;
  for (const listener of listeners) listener();
}

/**
 * Hook zum Lesen des E-Mail-Verifizierungsstatus.
 *
 * @returns Aktueller Status; die Komponente rendert bei Änderung neu.
 */
export function useEmailStatus(): EmailStatus {
  return useSyncExternalStore(subscribe, getSnapshot);
}
