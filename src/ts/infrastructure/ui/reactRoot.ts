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
 * Rendert `node` in `container`.
 *
 * Der Aufruf ist per `flushSync` bewusst synchron: der bestehende Code (Bootstrap-Modals,
 * CustomTable, Signatur-Dialog) liest direkt nach dem Rendern aus dem DOM. Preacts `render`
 * war synchron, `root.render` ist es nicht -- ohne `flushSync` liefen diese Stellen ins Leere.
 */
export function mount(container: Element | DocumentFragment, node: ReactNode): void {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  const zuRendern = root;
  flushSync(() => {
    zuRendern.render(node);
  });
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
