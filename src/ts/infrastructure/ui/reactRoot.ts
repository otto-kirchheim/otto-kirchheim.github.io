import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

/**
 * React 19 verlangt pro Container genau eine `Root`. Preacts `render(vnode, el)` war dagegen
 * beliebig oft auf demselben Element aufrufbar. Der Cache bildet das nach: gleicher Container
 * -> gleiche Root, `unmount` raeumt den Eintrag wieder ab.
 */
const roots = new WeakMap<Element | DocumentFragment, Root>();

/**
 * Gesetzt, solange ein `mount()` seinen `flushSync` abarbeitet. React rendert waehrenddessen --
 * ein zweites `flushSync` aus dieser Phase heraus warnt ("flushSync was called from inside a
 * lifecycle method") und wird ohnehin nicht sofort ausgefuehrt.
 */
let imFlush = false;

/**
 * Rendert `node` in `container`.
 *
 * Der Aufruf ist per `flushSync` bewusst synchron: der bestehende Code (Bootstrap-Modals,
 * CustomTable, Signatur-Dialog) liest direkt nach dem Rendern aus dem DOM. Preacts `render`
 * war synchron, `root.render` ist es nicht -- ohne `flushSync` liefen diese Stellen ins Leere.
 *
 * Verschachtelte Aufrufe gibt es seit Phase M regelmaessig: `CustomTable.draw()` mountet, und aus
 * einer so gerenderten Tabelle heraus oeffnet ein Klick per `showModal()` den naechsten Mount.
 * Der innere Aufruf laesst `flushSync` deshalb weg -- React arbeitet die Sync-Lane des neuen
 * Roots beim Verlassen des aeusseren `flushSync` mit ab.
 */
export function mount(container: Element | DocumentFragment, node: ReactNode): void {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  const zuRendern = root;

  if (imFlush) {
    zuRendern.render(node);
    return;
  }

  imFlush = true;
  try {
    flushSync(() => {
      zuRendern.render(node);
    });
  } finally {
    imFlush = false;
  }
}

/**
 * Haengt den Container ab und gibt die Root frei. Ersetzt Preacts `render(null, el)`.
 * Ohne Root ist der Aufruf ein No-op, mehrfaches Abhaengen also unkritisch.
 */
export function unmount(container: Element | DocumentFragment): void {
  const root = roots.get(container);
  if (!root) return;
  roots.delete(container);
  root.unmount();
}
