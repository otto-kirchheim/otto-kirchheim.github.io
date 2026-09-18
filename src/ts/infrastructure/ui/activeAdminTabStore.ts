/**
 * Aktiver Tab der Admin-Unternavigation (`admin-pane-*`-Gruppe), als `useSyncExternalStore`-
 * kompatibler Modul-Store -- exakte Kopie des Musters aus `activeTabStore.ts`, aber ein eigener
 * Store: Haupt- und Admin-Gruppe sind unabhaengige Tab-Zustaende, ein gemeinsamer Store wuerde
 * sie kuenstlich verkoppeln. `tabController.ts`s `zeigeTab()` schreibt hierher; `features/Admin/
 * index.tsx` liest per `useActiveAdminTab()` und berechnet daraus `data-active`/`aria-selected`/
 * `tabIndex`/Pane-Klassen selbst.
 */

type Listener = () => void;

let aktiverAdminTab: string | null = null;
const listeners = new Set<Listener>();

export function getAktivenAdminTab(): string | null {
  return aktiverAdminTab;
}

export function subscribeAktivenAdminTab(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAktivenAdminTab(id: string): void {
  if (id === aktiverAdminTab) return;
  aktiverAdminTab = id;
  for (const listener of listeners) listener();
}
