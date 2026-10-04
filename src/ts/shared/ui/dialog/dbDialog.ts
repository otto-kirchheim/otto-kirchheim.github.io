import { istHandyBreite } from '@/shared/ui/modal/DialogKontext';

/**
 * Vanilla-Gegenstueck zu `shared/ui/modal/showModal.tsx`/`MyDialog.tsx`: baut einen DB-Dialog als nativen `<dialog>` fuer die
 * Stellen, die ohne React arbeiten (Bestaetigungsabfrage, AutoSave-Fehlerdialog, Unterschriftenfeld). Aufbau wie von `DBDialog`
 * (zentriert ab `sm`) bzw. auf dem Handy wie von `DBDrawer` im Vollbild: Kopf, Inhalt, Fusszeile (siehe `istHandyBreite`).
 *
 * Escape, Fokus-Falle und Scroll-Sperre kommen von `<dialog>.showModal()`; den Klick auf
 * den Hintergrund muss man selbst abfangen, weil das Ereignis dort am Dialog selbst landet.
 */

export type DbDialog = {
  dialog: HTMLDialogElement;
  /** Kopfzeile (`null` ohne `titel`). */
  kopf: HTMLElement | null;
  /** Inhaltsbereich zwischen Kopf und Fusszeile. */
  inhalt: HTMLElement;
  /** Fusszeile fuer die Knoepfe. */
  fuss: HTMLElement;
  /** `true`, wenn der Dialog als Vollbild-Drawer (Handy) aufgebaut wurde. */
  vollbild: boolean;
  schliessen: () => void;
};

export type DbDialogOptionen = {
  /** Titel der Kopfzeile; ohne Angabe gibt es keine Kopfzeile (z. B. Unterschriftenfeld). */
  titel?: string;
  /** Zusaetzliche Klassen an der Kopfzeile (z. B. `db-color-critical`). */
  kopfKlassen?: string[];
  /** Breite des zentrierten Dialogs (Standard `medium`); auf dem Handy immer Vollbild. */
  containerSize?: 'small' | 'medium' | 'large' | 'full';
  /** Klick auf den Hintergrund schliesst (Standard: ja). */
  hintergrundSchliesst?: boolean;
  /** Escape schliesst (Standard: ja). Aus fuer Dialoge mit einer Entscheidung, die nicht
      versehentlich weggeklickt werden darf. */
  escapeSchliesst?: boolean;
  /** Zusaetzliche Klassen am `<dialog>`. */
  dialogKlassen?: string[];
};

let zaehler = 0;

/**
 * Haengt einen offenen Dialog an `document.body` und meldet ihn samt Kopf-, Inhalts- und Fussknoten
 * zurueck. `beimSchliessen` laeuft genau einmal -- egal ob per Escape, Hintergrund,
 * `data-dialog-dismiss` oder `schliessen()`.
 *
 * @param beimSchliessen - Callback nach dem Schliessen und Entfernen des Dialogs.
 * @param optionen - Titel, Breite, Schliessverhalten und Klassen (siehe `DbDialogOptionen`).
 * @returns Dialog-Element, Kopf, Inhalts- und Fussbereich und `schliessen()`-Funktion.
 */
export function erzeugeDbDialog(beimSchliessen: () => void, optionen: DbDialogOptionen = {}): DbDialog {
  const {
    titel,
    kopfKlassen = [],
    containerSize,
    hintergrundSchliesst = true,
    escapeSchliesst = true,
    dialogKlassen = [],
  } = optionen;
  const vollbild = istHandyBreite();
  const art = vollbild ? 'drawer' : 'dialog';

  const dialog = document.createElement('dialog');
  dialog.className = [`db-${art}`, ...dialogKlassen].join(' ');

  let kopf: HTMLElement | null = null;
  if (titel !== undefined) {
    kopf = document.createElement(vollbild ? 'header' : 'div');
    kopf.className = [`db-${art}-header`, ...kopfKlassen].join(' ');
    const ueberschriftId = `db-dialog-titel-${++zaehler}`;
    const inhaltTitel = document.createElement('div');
    inhaltTitel.className = `db-${art}-header-content`;
    inhaltTitel.id = ueberschriftId;
    const ueberschrift = document.createElement('h2');
    ueberschrift.textContent = titel;
    inhaltTitel.append(ueberschrift);
    const schliessenKnopf = document.createElement('button');
    schliessenKnopf.type = 'button';
    schliessenKnopf.className = 'db-button';
    schliessenKnopf.dataset['icon'] = 'cross';
    schliessenKnopf.dataset['variant'] = 'ghost';
    schliessenKnopf.dataset['noText'] = 'true';
    schliessenKnopf.dataset['dialogDismiss'] = 'modal';
    schliessenKnopf.textContent = 'Schließen';
    kopf.append(inhaltTitel, schliessenKnopf);
    dialog.setAttribute('aria-labelledby', ueberschriftId);
  }

  const inhalt = document.createElement('div');
  inhalt.className = `db-${art}-content`;
  const fuss = document.createElement(vollbild ? 'footer' : 'div');
  fuss.className = `db-${art}-footer`;

  if (vollbild) {
    dialog.dataset['direction'] = 'to-left';
    const rahmen = document.createElement('article');
    rahmen.className = 'db-drawer-container';
    rahmen.dataset['containerSize'] = 'full';
    rahmen.dataset['showSpacing'] = 'false';
    rahmen.dataset['direction'] = 'to-left';
    rahmen.append(...(kopf ? [kopf] : []), inhalt, fuss);
    dialog.append(rahmen);
  } else {
    if (containerSize) dialog.dataset['containerSize'] = containerSize;
    dialog.append(...(kopf ? [kopf] : []), inhalt, fuss);
  }
  document.body.append(dialog);

  let erledigt = false;
  /** Schliesst und entfernt den Dialog und ruft `beimSchliessen`; jeder weitere Aufruf ist ein No-op. */
  const schliessen = () => {
    if (erledigt) return;
    erledigt = true;
    dialog.close();
    dialog.remove();
    beimSchliessen();
  };

  dialog.addEventListener('cancel', event => {
    // Escape: nie den Browser schliessen lassen, sonst laeuft der eigene Abbau nicht.
    event.preventDefault();
    if (escapeSchliesst) schliessen();
  });

  dialog.addEventListener('click', event => {
    const ziel = event.target as HTMLElement | null;
    if (ziel?.closest('[data-dialog-dismiss="modal"], [data-action="close"]')) {
      event.preventDefault();
      schliessen();
      return;
    }
    if (hintergrundSchliesst && ziel === dialog) schliessen();
  });

  dialog.showModal();
  // `showModal()` fokussiert das erste bedienbare Element (der Schliessen-Knopf im Kopf, dessen Tooltip/Fokusring dann sofort
  // erscheint). Der Fokus geht an den Dialog selbst; Fokus-Falle und Escape bleiben.
  dialog.tabIndex = -1;
  dialog.focus({ preventScroll: true });

  return { dialog, kopf, inhalt, fuss, vollbild, schliessen };
}
