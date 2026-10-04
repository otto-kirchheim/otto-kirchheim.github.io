/**
 * Ladezustand pro Button-Id, fuer React-verwaltete Buttons (`DBLoadingButton`).
 *
 * `setLoading`/`clearLoading` werden ausserhalb von React mit einer Button-Id aufgerufen
 * (Business-Logik, Login-Flow, `saveDaten.ts`, `generatePDF.ts`). Native `<button>`-Elemente
 * bearbeiten sie direkt im DOM; bei `DBButton` wuerde das den React-Tree unterlaufen
 * (`replaceChildren` entfernt React-verwaltete Kindknoten, das naechste Reconcile scheitert mit
 * `NotFoundError: removeChild`). Dieser Store macht den Ladezustand stattdessen abonnierbar:
 * `DBLoadingButton` liest ihn per `useButtonLoading` und rendert Spinner/Inhalt selbst.
 */

type Listener = () => void;

const loadingIds = new Set<string>();
const listeners = new Map<string, Set<Listener>>();

/**
 * Prueft, ob der Button mit dieser Id gerade laedt.
 *
 * @param id - Button-Id.
 * @returns `true` im Ladezustand.
 */
export function isButtonLoading(id: string): boolean {
  return loadingIds.has(id);
}

/**
 * Registriert einen Listener fuer Ladezustands-Wechsel eines einzelnen Buttons.
 *
 * @param id - Button-Id.
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeButtonLoading(id: string, listener: Listener): () => void {
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(id);
  };
}

/**
 * Setzt den Ladezustand eines Buttons und benachrichtigt dessen Listener; bei unveraendertem Zustand passiert nichts.
 *
 * @param id - Button-Id.
 * @param loading - `true` = laedt.
 */
export function setButtonLoading(id: string, loading: boolean): void {
  if (loading === loadingIds.has(id)) return;
  if (loading) loadingIds.add(id);
  else loadingIds.delete(id);
  for (const listener of listeners.get(id) ?? []) listener();
}
