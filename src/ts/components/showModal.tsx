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
 * `data-dialog-dismiss="modal"` schliessen weiter -- ueber Delegation, damit kein einziger
 * Dialog-Baustein angefasst werden muss. Der Schliessen-Knopf des Drawers selbst traegt
 * `data-action="close"` und laeuft ueber dessen `onClose`.
 */

/** Richtung, aus der Dialoge einfahren. */
export const DIALOG_RICHTUNG = 'to-left' as const;

/** Schliess-Funktion je Dialog-Container -- fuer `data-dialog-dismiss` und gestapelte Dialoge. */
const schliesser = new WeakMap<HTMLElement, () => void>();

/** Per `beiModalSchliessen` registrierte Aufraeum-Funktion je Dialog-Container. */
const aufraeumer = new WeakMap<HTMLElement, () => void>();

/** Ruft die fuer `container` registrierte Aufraeum-Funktion genau einmal auf, falls vorhanden. */
function aufraeumenFuer(container: HTMLElement): void {
  const aufraeumen = aufraeumer.get(container);
  if (!aufraeumen) return;
  aufraeumer.delete(container);
  aufraeumen();
}

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
    // `db-ux/drawer-header-required` verlangt `header={<DBDrawerHeader/>}`. Diese Huelle ist
    // generisch -- den Titel bringt erst der `children`-Inhalt mit (`MyModalHeader`, der den
    // `<dialog>` selbst per `aria-labelledby` verknuepft). Auf die `header`-Prop umstellen kann
    // erst der Umbau der Modal-Bausteine (Phase H).
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
  aufraeumenFuer(modal);
  unmount(modal);
  zuruecksetzen(modal);
}

/**
 * Registriert `aufraeumen`, damit es genau einmal aufgerufen wird, sobald der aktuell offene
 * Dialog-Inhalt aus `#modal` entfernt wird -- durch `schliesseModal` oder durch das direkte
 * Neu-Oeffnen eines anderen Dialogs im selben Container (`showModal`s Ersetzen-Zweig). Beide
 * Stellen rufen `aufraeumenFuer(modal)` synchron und direkt auf, kein DOM-Beobachten noetig.
 *
 * Ersatz fuer das tote `modal.addEventListener('hide.bs.modal', ...)`: `hide.bs.modal` ist ein
 * Bootstrap-Plugin-Event und feuert seit Phase H (Bootstrap raus) nie mehr. Ohne diese Bruecke
 * leaken pro Dialog-Oeffnung registrierte `onEvent`-Listener (Sync-Hinweise in den EA-/Neben-/
 * Bereitschaftseinsatz-Dialogen).
 */
export function beiModalSchliessen(aufraeumen: () => void): void {
  const modal = document.querySelector<HTMLElement>('#modal');
  if (!modal) return;
  aufraeumer.set(modal, aufraeumen);
}

export default function showModal<T extends CustomTableTypes>(children: ReactNode): CustomHTMLDivElement<T> {
  const modal = document.querySelector<CustomHTMLDivElement<T>>('#modal');
  if (!modal) throw new Error('Element nicht gefunden');

  if (modal.childElementCount > 0) {
    aufraeumenFuer(modal);
    unmount(modal);
  }
  if (modal.row !== null || modal.childElementCount > 0) zuruecksetzen(modal);

  oeffneDrawer(modal, children, schliesseModal);

  return modal;
}

// Ersatz fuer das entfernte Bootstrap-Plugin: `data-dialog-dismiss="modal"` bleibt der
// Abbrechen-/Schliessen-Marker im Markup. Delegation am Dokument erfasst damit auch
// gestapelte Dialoge und spaeter nachgerenderte Schaltflaechen.
document.addEventListener('click', event => {
  const knopf = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-dialog-dismiss="modal"]');
  const container = knopf?.closest<HTMLElement>('.db-drawer')?.parentElement;
  const schliessen = container ? schliesser.get(container) : undefined;
  if (!schliessen) return;

  event.preventDefault();
  schliessen();
});
