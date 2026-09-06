import { useLayoutEffect, type Ref, type RefObject } from 'react';

/**
 * Verbindet die Ref des Aufrufers mit einer eigenen Ref auf dasselbe Element.
 * (React 19 unterstuetzt zwar Ref-Callbacks mit Cleanup, aber nicht mehrere Refs am Element.)
 */
export function refZusammenfuehren<T>(...refs: (Ref<T> | undefined)[]): (element: T | null) => void {
  return (element: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(element);
      else (ref as { current: T | null }).current = element;
    }
  };
}

/**
 * Setzt die `id` direkt nach dem Commit auf das Element.
 *
 * Die DB-UX-Komponenten vergeben ihre `id` erst in einem `useEffect` -- direkt nach
 * `mount()` steht sie also noch nicht im DOM. Der bestehende Code sucht seine Felder aber
 * synchron (`document.querySelector('#Tag')?.addEventListener(...)` unmittelbar nach
 * `showModal()`), und ein `?.` schluckt den Fehlschlag lautlos. `useLayoutEffect` laeuft
 * noch innerhalb des `flushSync`-Commits und schliesst diese Luecke.
 */
export function useSofortigeId<T extends HTMLElement>(ref: RefObject<T | null>, id?: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (id && element && element.id !== id) element.id = id;
  }, [ref, id]);
}
