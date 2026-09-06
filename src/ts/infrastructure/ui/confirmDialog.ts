import { erzeugeDbDialog } from './dbDialog';

/**
 * Async Dialog-Ersatz für window.confirm() (DB-Drawer über nativem `<dialog>`).
 * Gibt ein Promise<boolean> zurück (true = bestätigt, false = abgebrochen).
 */

export interface ConfirmDialogOptions {
  /** Titel im Modal-Header (default: 'Bestätigung') */
  title?: string;
  /** Text des Bestätigungs-Buttons (default: 'OK') */
  confirmLabel?: string;
  /** Text des Abbrechen-Buttons (default: 'Abbrechen') */
  cancelLabel?: string;
  /** CSS-Klasse für Bestätigungs-Button (default: 'btn-danger') */
  confirmClass?: string;
}

export function confirmDialog(message: string, options: ConfirmDialogOptions = {}): Promise<boolean> {
  const {
    title = 'Bestätigung',
    confirmLabel = 'OK',
    cancelLabel = 'Abbrechen',
    confirmClass = 'btn-danger',
  } = options;

  return new Promise<boolean>(resolve => {
    const escapedMessage = message.replace(/\n/g, '<br>');

    let ergebnis = false;
    const { inhalt, schliessen } = erzeugeDbDialog(() => resolve(ergebnis));

    inhalt.innerHTML = `
      <div class="db-drawer-header">
        <h5>${title}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="dialog-koerper"><p>${escapedMessage}</p></div>
      <div class="dialog-fuss">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelLabel}</button>
        <button type="button" class="btn ${confirmClass}" data-confirm="true">${confirmLabel}</button>
      </div>
    `;

    inhalt.querySelector('[data-confirm="true"]')?.addEventListener('click', () => {
      ergebnis = true;
      schliessen();
    });
  });
}
