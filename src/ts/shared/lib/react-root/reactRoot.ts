import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

/**
 * React 19 verlangt pro Container genau eine `Root`. Der Cache erlaubt beliebig viele `mount()`-Aufrufe
 * je Container: gleicher Container -> gleiche Root, `unmount` raeumt den Eintrag wieder ab.
 */
const roots = new WeakMap<Element | DocumentFragment, Root>();

/**
 * Gesetzt, solange ein `mount()` seinen `flushSync` abarbeitet. React rendert waehrenddessen --
 * ein zweites `flushSync` aus dieser Phase heraus warnt ("flushSync was called from inside a
 * lifecycle method") und wird ohnehin nicht sofort ausgefuehrt.
 */
let imFlush = false;

/**
 * Fuehrt `fn` synchron aus und flusht dabei ausgeloeste React-Updates (Renders wie
 * `mount()`, aber auch reine Store-Mutationen, die `useSyncExternalStore`-Abonnenten
 * benachrichtigen -- z. B. `tabController.ts`s `setAktivenTab()`). Aufrufer, die direkt
 * danach aus dem DOM lesen (Sichtbarkeit, `clientWidth` etc.), brauchen diese Garantie.
 *
 * Nutzt denselben Re-Entranz-Schutz wie `mount()`: verschachtelte Aufrufe (z. B. ein
 * Tab-Wechsel, der aus einem gerade per `flushSync` gemounteten Baum heraus ausgeloest
 * wird) lassen das innere `flushSync` weg, statt zu warnen -- die aeussere Flush-Phase
 * arbeitet die Sync-Lane ohnehin mit ab.
 *
 * @param fn - Auszufuehrende Funktion (loest React-Updates aus).
 */
export function flushExtern(fn: () => void): void {
  if (imFlush) {
    fn();
    return;
  }

  imFlush = true;
  try {
    flushSync(fn);
  } finally {
    imFlush = false;
  }
}

/**
 * Rendert `node` in `container`.
 *
 * Der Aufruf ist per `flushSync` bewusst synchron: der bestehende Code (Modals, CustomTable,
 * Signatur-Dialog) liest direkt nach dem Rendern aus dem DOM, `root.render` allein ist asynchron.
 *
 * Verschachtelte Aufrufe kommen regelmaessig vor: `CustomTable.draw()` mountet, und aus
 * einer so gerenderten Tabelle heraus oeffnet ein Klick per `showModal()` den naechsten Mount.
 * Der innere Aufruf laesst `flushSync` deshalb weg -- React arbeitet die Sync-Lane des neuen
 * Roots beim Verlassen des aeusseren `flushSync` mit ab.
 *
 * @param container - DOM-Element, in das gerendert wird; die `Root` wird je Container wiederverwendet.
 * @param node - Zu rendernder React-Knoten.
 */
export function mount(container: Element | DocumentFragment, node: ReactNode): void {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  const zuRendern = root;
  flushExtern(() => zuRendern.render(node));
}

/**
 * Haengt den Container ab und gibt die Root frei. Ohne Root ist der Aufruf ein No-op,
 * mehrfaches Abhaengen also unkritisch.
 *
 * @param container - Zuvor mit `mount()` befuellter Container.
 */
export function unmount(container: Element | DocumentFragment): void {
  const root = roots.get(container);
  if (!root) return;
  roots.delete(container);
  root.unmount();
}
