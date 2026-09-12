/**
 * Phase K6: aktiver Tab der Hauptnavigation (`#tabContent`-Gruppe) als `useSyncExternalStore`-
 * kompatibler Modul-Store, analog `navigationVisibleStore.ts`. `tabController.ts`s `zeigeTab()`
 * schreibt hierher; `AppHeader.tsx` liest per `useActiveTab()` und berechnet daraus
 * `aria-selected`/`tabindex`/`data-active` selbst -- der DOM-Handschrieb auf die Hauptnav-
 * Schalter entfaellt in `zeigeTab()` dadurch (Admins Unternavigation ist eine eigene, separate
 * Tab-Gruppe und bleibt unveraendert am alten, DOM-schreibenden Mechanismus).
 */

type Listener = () => void;

let aktiverTab: string | null = null;
const listeners = new Set<Listener>();

export function getAktivenTab(): string | null {
  return aktiverTab;
}

export function subscribeAktivenTab(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAktivenTab(id: string): void {
  if (id === aktiverTab) return;
  aktiverTab = id;
  for (const listener of listeners) listener();
}
