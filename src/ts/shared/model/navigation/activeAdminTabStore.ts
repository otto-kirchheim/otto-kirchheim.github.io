/**
 * Aktiver Tab der Admin-Unternavigation (`admin-pane-*`-Gruppe) als `useSyncExternalStore`-
 * kompatibler Modul-Store, gleiches Muster wie `activeTabStore.ts`, aber ein eigener Store:
 * Haupt- und Admin-Gruppe sind unabhaengige Tab-Zustaende. `tabController.ts`s `zeigeTab()`
 * schreibt hierher; `pages/admin/index.tsx` liest per `useActiveAdminTab()` und berechnet
 * `data-active`/`aria-selected`/`tabIndex`/Pane-Klassen selbst.
 */

type Listener = () => void;

let aktiverAdminTab: string | null = null;
const listeners = new Set<Listener>();

/**
 * Liefert den aktiven Admin-Tab.
 *
 * @returns Id des aktiven `admin-pane-*`-Tabs; `null`, solange noch keiner gesetzt wurde.
 */
export function getAktivenAdminTab(): string | null {
  return aktiverAdminTab;
}

/**
 * Registriert einen Listener, der bei jedem Wechsel des Admin-Tabs aufgerufen wird.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeAktivenAdminTab(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt den aktiven Admin-Tab und benachrichtigt alle Listener; bei unveraenderter Id passiert nichts.
 *
 * @param id - Id des `admin-pane-*`-Tabs.
 */
export function setAktivenAdminTab(id: string): void {
  if (id === aktiverAdminTab) return;
  aktiverAdminTab = id;
  for (const listener of listeners) listener();
}
