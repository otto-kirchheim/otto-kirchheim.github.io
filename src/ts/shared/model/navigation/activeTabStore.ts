/**
 * Aktiver Tab der Hauptnavigation (`#tabContent`-Gruppe) als `useSyncExternalStore`-kompatibler
 * Modul-Store. `tabController.ts`s `zeigeTab()` schreibt hierher; `AppHeader.tsx` und `App.tsx`
 * lesen per `useActiveTab()` und berechnen daraus `aria-selected`/`tabindex`/`data-active` bzw.
 * die Pane-Klassen selbst. Die Admin-Unternavigation hat einen eigenen Store
 * (`activeAdminTabStore.ts`).
 */

type Listener = () => void;

let aktiverTab: string | null = null;
const listeners = new Set<Listener>();

/**
 * Liefert den aktiven Haupt-Tab.
 *
 * @returns Id des aktiven Tab-Panels; `null`, solange noch keiner gesetzt wurde.
 */
export function getAktivenTab(): string | null {
  return aktiverTab;
}

/**
 * Registriert einen Listener, der bei jedem Wechsel des Haupt-Tabs aufgerufen wird.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeAktivenTab(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt den aktiven Haupt-Tab und benachrichtigt alle Listener; bei unveraenderter Id passiert nichts.
 *
 * @param id - Id des Tab-Panels.
 */
export function setAktivenTab(id: string): void {
  if (id === aktiverTab) return;
  aktiverTab = id;
  for (const listener of listeners) listener();
}
