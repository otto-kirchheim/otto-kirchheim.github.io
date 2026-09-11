/**
 * Ladezustand pro Button-Id, fuer React-verwaltete Buttons (`DBLoadingButton`).
 *
 * `setLoading`/`clearLoading` (siehe dort) werden aus vielen Aufrufstellen ausserhalb
 * von React heraus mit einer Button-Id aufgerufen (Business-Logik in `features/*\/utils`,
 * Login-Flow, `saveDaten.ts`, `generatePDF.ts`). Fuer noch-native `<button>`-Elemente
 * manipulieren sie den DOM direkt; fuer `DBButton`-Instanzen wuerde das den React-Tree
 * unterlaufen (`replaceChildren` entfernt React-verwaltete Kindknoten, ein spaeteres
 * Reconcile schlaegt dann mit `NotFoundError: removeChild` fehl). Dieser Store macht
 * den Ladezustand stattdessen deklarativ abonnierbar, `DBLoadingButton` liest ihn per
 * `useButtonLoading` und rendert Spinner/Inhalt selbst.
 */

type Listener = () => void;

const loadingIds = new Set<string>();
const listeners = new Map<string, Set<Listener>>();

export function isButtonLoading(id: string): boolean {
  return loadingIds.has(id);
}

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

export function setButtonLoading(id: string, loading: boolean): void {
  if (loading === loadingIds.has(id)) return;
  if (loading) loadingIds.add(id);
  else loadingIds.delete(id);
  for (const listener of listeners.get(id) ?? []) listener();
}
