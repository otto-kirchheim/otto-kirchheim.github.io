import { DBDrawer } from '@db-ux/react-core-components';
import { type ReactNode } from 'react';
import { mount, unmount } from '@/shared/lib/react-root/reactRoot';
import { DialogKontext, istHandyBreite } from '@/shared/ui/modal/DialogKontext';

import type { CustomHTMLDivElement } from '@/types';
import type { CustomTableTypes } from '@/shared/ui/custom-table/CustomTable';

/**
 * Dialoge laufen ueber `DBDialog` (zentriert ab `sm`) bzw. `DBDrawer` (Vollbild auf dem Handy, Seitenleiste fuer freie Inhalte,
 * `oeffneDrawer`). Beide bauen auf nativem
 * `<dialog>`: Escape, Backdrop-Klick, Fokus-Falle und Scroll-Sperre kommen vom Browser.
 *
 * Vertrag der Aufrufstellen: `showModal(children)` gibt `#modal` synchron zurueck, `#modal.row`
 * und `#modal.role` bleiben beschreibbar. Schaltflaechen mit `data-dialog-dismiss="modal"`
 * schliessen per Delegation am Dokument (siehe unten). Der Schliessen-Knopf des Drawers selbst
 * traegt `data-action="close"` und laeuft ueber dessen `onClose`.
 */

/** Richtung, aus der Dialoge einfahren. */
export const DIALOG_RICHTUNG = 'to-left' as const;

/** Schliess-Funktion je Dialog-Container -- fuer `data-dialog-dismiss` und gestapelte Dialoge. */
const schliesser = new WeakMap<HTMLElement, () => void>();

/** Per `beiModalSchliessen` registrierte Aufraeum-Funktion je Dialog-Container. */
const aufraeumer = new WeakMap<HTMLElement, () => void>();

/**
 * Ruft die fuer `container` registrierte Aufraeum-Funktion genau einmal auf, falls vorhanden.
 *
 * @param container - Dialog-Container, dessen Aufraeum-Funktion ausgefuehrt wird.
 */
function aufraeumenFuer(container: HTMLElement): void {
  const aufraeumen = aufraeumer.get(container);
  if (!aufraeumen) return;
  aufraeumer.delete(container);
  aufraeumen();
}

/**
 * Setzt `#modal` fuer den naechsten Dialog zurueck: `row` auf `null`, `role` auf `document`,
 * Inhalt leer.
 *
 * @param modal - Der geteilte Dialog-Container `#modal`.
 */
function zuruecksetzen<T extends CustomTableTypes>(modal: CustomHTMLDivElement<T>): void {
  modal.row = null;
  modal.role = 'document';
  modal.innerHTML = '';
}

/**
 * Oeffnet einen Drawer in `container` und merkt sich `beimSchliessen` fuer `data-dialog-dismiss`.
 * Eigenstaendige Container nutzt die Hilfe, die sich bewusst ueber einen bereits offenen Dialog
 * legt -- `<dialog>` stapelt dafuer nativ.
 *
 * @param container - Element, in das der Drawer gemountet wird.
 * @param inhalt - Dialog-Inhalt (Header, Body, Footer).
 * @param beimSchliessen - Wird beim Schliessen des Drawers und bei `data-dialog-dismiss` aufgerufen.
 */
export function oeffneDrawer(container: HTMLElement, inhalt: ReactNode, beimSchliessen: () => void): void {
  schliesser.set(container, beimSchliessen);
  mount(
    container,
    // `db-ux/drawer-header-required` verlangt `header={<DBDrawerHeader/>}`. Diese Huelle ist
    // generisch -- den Titel bringt erst der `children`-Inhalt mit (`MyModalHeader`, der den
    // `<dialog>` selbst per `aria-labelledby` verknuepft).
    // eslint-disable-next-line db-ux/drawer-header-required
    <DBDrawer open direction={DIALOG_RICHTUNG} showSpacing={false} rounded onClose={beimSchliessen}>
      {inhalt}
    </DBDrawer>,
  );
}

/**
 * Oeffnet einen Dialog in `container` und merkt sich `beimSchliessen` fuer `data-dialog-dismiss`. Der Inhalt bringt seine
 * Huelle mit (`MyDialog`: `DBDialog`, auf dem Handy ein Vollbild-`DBDrawer`; Breite ueber `TMyModal.size`).
 *
 * @param container - Element, in das der Dialog gemountet wird.
 * @param inhalt - Dialog-Inhalt (Header, Body, Footer).
 * @param beimSchliessen - Wird beim Schliessen des Dialogs und bei `data-dialog-dismiss` aufgerufen.
 */
export function oeffneDialog(container: HTMLElement, inhalt: ReactNode, beimSchliessen: () => void): void {
  schliesser.set(container, beimSchliessen);
  // Den `DBDialog` selbst rendert `MyDialog` (Header-/Footer-Slot); der Kontext liefert ihm das Schliessen.
  // Handy-Breite (unter `sm`): statt des zentrierten Dialogs oeffnet ein Vollbild-Drawer. Einmal beim Oeffnen entschieden.
  const vollbild = istHandyBreite();
  mount(
    container,
    <DialogKontext.Provider value={{ schliessen: beimSchliessen, vollbild }}>{inhalt}</DialogKontext.Provider>,
  );
}

/** Schliesst den geteilten Dialog (`#modal`), falls einer offen ist: Aufraeumer, Unmount, Reset. */
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
 * Stellen rufen `aufraeumenFuer(modal)` synchron auf, kein DOM-Beobachten noetig. Ohne diese
 * Registrierung leaken pro Dialog-Oeffnung `onEvent`-Listener (Sync-Hinweise in den EA-/Neben-/
 * Bereitschaftseinsatz-Dialogen).
 *
 * @param aufraeumen - Aufraeum-Funktion; ersetzt eine zuvor registrierte. Ohne `#modal` wirkungslos.
 */
export function beiModalSchliessen(aufraeumen: () => void): void {
  const modal = document.querySelector<HTMLElement>('#modal');
  if (!modal) return;
  aufraeumer.set(modal, aufraeumen);
}

/**
 * Zeigt `children` im geteilten Dialog `#modal` und ersetzt dabei einen bereits offenen Inhalt
 * (dessen Aufraeumer laeuft vorher).
 *
 * @typeParam T - Tabellentyp, den `#modal.row` traegt.
 * @param children - Dialog-Inhalt.
 * @returns Das `#modal`-Element, synchron nach dem Mounten.
 * @throws {Error} Wenn `#modal` im DOM fehlt.
 */
export default function showModal<T extends CustomTableTypes>(children: ReactNode): CustomHTMLDivElement<T> {
  const modal = document.querySelector<CustomHTMLDivElement<T>>('#modal');
  if (!modal) throw new Error('Element nicht gefunden');

  if (modal.childElementCount > 0) {
    aufraeumenFuer(modal);
    unmount(modal);
  }
  if (modal.row !== null || modal.childElementCount > 0) zuruecksetzen(modal);

  oeffneDialog(modal, children, schliesseModal);

  return modal;
}

// `data-dialog-dismiss="modal"` ist der Abbrechen-/Schliessen-Marker im Markup. Delegation am
// Dokument erfasst auch gestapelte Dialoge und spaeter nachgerenderte Schaltflaechen.
document.addEventListener('click', event => {
  const knopf = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-dialog-dismiss="modal"]');
  // Der Dialog liegt nicht immer direkt im Container (Formular-Dialoge: `<form><dialog>`): bis zum registrierten Container hochgehen.
  let container = knopf?.closest<HTMLElement>('.db-drawer, .db-dialog')?.parentElement ?? null;
  while (container && !schliesser.has(container)) container = container.parentElement;
  const schliessen = container ? schliesser.get(container) : undefined;
  if (!schliessen) return;

  event.preventDefault();
  schliessen();
});
