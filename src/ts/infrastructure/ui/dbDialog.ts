/**
 * Vanilla-Gegenstueck zu `components/showModal.tsx`: baut einen DB-Drawer als nativen
 * `<dialog>` fuer die Stellen, die ohne React arbeiten (Bestaetigungsabfrage, AutoSave-
 * Fehlerdialog, Unterschriftenfeld).
 *
 * Escape, Fokus-Falle und Scroll-Sperre kommen von `<dialog>.showModal()`; den Klick auf
 * den Hintergrund muss man selbst abfangen, weil das Ereignis dort am Dialog selbst landet.
 */

export type DbDialog = {
  dialog: HTMLDialogElement;
  /** Inhaltsbereich innerhalb des Drawer-Rahmens. */
  inhalt: HTMLElement;
  schliessen: () => void;
};

export type DbDialogOptionen = {
  /** Klick auf den Hintergrund schliesst (Standard: ja). */
  hintergrundSchliesst?: boolean;
  /** Escape schliesst (Standard: ja). Aus fuer Dialoge mit einer Entscheidung, die nicht
      versehentlich weggeklickt werden darf. */
  escapeSchliesst?: boolean;
  /** Zusaetzliche Klassen am Drawer-Rahmen. */
  rahmenKlassen?: string[];
};

/**
 * Haengt einen offenen Drawer-Dialog an `document.body` und meldet ihn samt Inhaltsknoten
 * zurueck. `beimSchliessen` laeuft genau einmal -- egal ob per Escape, Hintergrund,
 * `data-bs-dismiss` oder `schliessen()`.
 */
export function erzeugeDbDialog(beimSchliessen: () => void, optionen: DbDialogOptionen = {}): DbDialog {
  const { hintergrundSchliesst = true, escapeSchliesst = true, rahmenKlassen = [] } = optionen;

  const dialog = document.createElement('dialog');
  dialog.className = 'db-drawer';
  dialog.dataset['direction'] = 'to-left';

  const rahmen = document.createElement('article');
  rahmen.className = ['db-drawer-container', ...rahmenKlassen].join(' ');
  rahmen.dataset['direction'] = 'to-left';
  rahmen.dataset['rounded'] = 'true';
  rahmen.dataset['showSpacing'] = 'false';

  const inhalt = document.createElement('div');
  inhalt.className = 'db-drawer-content';

  rahmen.append(inhalt);
  dialog.append(rahmen);
  document.body.append(dialog);

  let erledigt = false;
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
    if (ziel?.closest('[data-bs-dismiss="modal"], [data-action="close"]')) {
      event.preventDefault();
      schliessen();
      return;
    }
    if (hintergrundSchliesst && ziel === dialog) schliessen();
  });

  dialog.showModal();

  return { dialog, inhalt, schliessen };
}

/**
 * Statische Dialoge im HTML (Impressum) oeffnen sich ueber `data-dialog-target="<Id>"` am
 * Ausloeser -- der Ersatz fuer Bootstraps `data-bs-toggle="modal"`. Geschlossen wird ueber
 * `[data-action="close"]`, den Hintergrund oder Escape.
 */
export function initStatischeDialoge(): () => void {
  const beiKlick = (event: MouseEvent) => {
    const ziel = event.target as HTMLElement | null;

    const ausloeser = ziel?.closest<HTMLElement>('[data-dialog-target]');
    if (ausloeser) {
      const id = ausloeser.dataset['dialogTarget'];
      const dialog = id ? document.querySelector<HTMLDialogElement>(`#${CSS.escape(id)}`) : null;
      if (dialog && !dialog.open) dialog.showModal();
      return;
    }

    const offener = ziel?.closest<HTMLDialogElement>('dialog[open]');
    if (!offener) return;
    if (ziel?.closest('[data-action="close"], [data-bs-dismiss="modal"]') || ziel === offener) offener.close();
  };

  document.addEventListener('click', beiKlick);
  return () => document.removeEventListener('click', beiKlick);
}
