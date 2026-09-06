import { DBDrawer } from '@db-ux/react-core-components';
import { type ReactNode } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import type { CustomHTMLDivElement } from '@/types';
import type { CustomTableTypes } from '@/infrastructure/table/CustomTable';

/**
 * Dialoge laufen seit der DB-UX-Umstellung ueber `DBDrawer` -- DB UX v5 hat keine
 * Modal-Komponente, der Drawer ist das Pendant. Er baut auf nativem `<dialog>`:
 * Escape, Backdrop-Klick, Fokus-Falle und Scroll-Sperre kommen damit vom Browser statt
 * aus Bootstraps `Modal`-Plugin.
 *
 * Der Vertrag der Aufrufstellen bleibt: `showModal(children)` gibt `#modal` synchron
 * zurueck und `#modal.row`/`#modal.role` bleiben beschreibbar. Schaltflaechen mit
 * `data-bs-dismiss="modal"` schliessen weiter -- ueber Delegation, damit kein einziger
 * Dialog-Baustein angefasst werden muss. Der Schliessen-Knopf des Drawers selbst traegt
 * `data-action="close"` und laeuft ueber dessen `onClose`.
 */

/** Richtung, aus der Dialoge einfahren. */
export const DIALOG_RICHTUNG = 'to-left' as const;

/** Schliess-Funktion je Dialog-Container -- fuer `data-bs-dismiss` und gestapelte Dialoge. */
const schliesser = new WeakMap<HTMLElement, () => void>();

function zuruecksetzen<T extends CustomTableTypes>(modal: CustomHTMLDivElement<T>): void {
  modal.row = null;
  modal.role = 'document';
  modal.innerHTML = '';
}

/**
 * Oeffnet einen Drawer in `container`. Eigenstaendige Container nutzt die Hilfe, die sich
 * bewusst ueber einen bereits offenen Dialog legt -- `<dialog>` stapelt dafuer nativ.
 */
export function oeffneDrawer(container: HTMLElement, inhalt: ReactNode, beimSchliessen: () => void): void {
  schliesser.set(container, beimSchliessen);
  mount(
    container,
    // Kopfzeile samt Titel und Schliessen-Knopf bringt der Dialog-Inhalt selbst mit
    // (`MyModalHeader`), inklusive `aria-labelledby`-Bezug -- ein zweiter `DBDrawerHeader`
    // waere eine doppelte Ueberschrift. Faellt mit dem Umbau der Modal-Bausteine (Phase H).
    // eslint-disable-next-line db-ux/drawer-header-required
    <DBDrawer open direction={DIALOG_RICHTUNG} showSpacing={false} rounded onClose={beimSchliessen}>
      {inhalt}
    </DBDrawer>,
  );
}

/** Schliesst den geteilten Dialog (`#modal`), falls einer offen ist. */
export function schliesseModal(): void {
  const modal = document.querySelector<CustomHTMLDivElement<CustomTableTypes>>('#modal');
  if (!modal || modal.childElementCount === 0) return;

  schliesser.delete(modal);
  unmount(modal);
  zuruecksetzen(modal);
}

export default function showModal<T extends CustomTableTypes>(children: ReactNode): CustomHTMLDivElement<T> {
  const modal = document.querySelector<CustomHTMLDivElement<T>>('#modal');
  if (!modal) throw new Error('Element nicht gefunden');

  if (modal.childElementCount > 0) unmount(modal);
  if (modal.row !== null || modal.childElementCount > 0) zuruecksetzen(modal);

  oeffneDrawer(modal, children, schliesseModal);

  return modal;
}

// Ersatz fuer das entfernte Bootstrap-Plugin: `data-bs-dismiss="modal"` bleibt der
// Abbrechen-/Schliessen-Marker im Markup. Delegation am Dokument erfasst damit auch
// gestapelte Dialoge und spaeter nachgerenderte Schaltflaechen.
document.addEventListener('click', event => {
  const knopf = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-bs-dismiss="modal"]');
  const container = knopf?.closest<HTMLElement>('.db-drawer')?.parentElement;
  const schliessen = container ? schliesser.get(container) : undefined;
  if (!schliessen) return;

  event.preventDefault();
  schliessen();
});
