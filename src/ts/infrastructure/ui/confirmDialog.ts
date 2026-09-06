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
  /**
   * Semantik des Bestätigungs-Buttons (default: 'critical'). Steuert die Farbe des
   * DB-Buttons; `undefined` laesst ihn neutral.
   */
  confirmColor?: 'critical' | 'warning' | 'successful' | 'informational';
  /** Variante des Bestätigungs-Buttons (default: 'filled'). */
  confirmVariant?: 'brand' | 'filled' | 'outlined' | 'ghost';
}

export function confirmDialog(message: string, options: ConfirmDialogOptions = {}): Promise<boolean> {
  const {
    title = 'Bestätigung',
    confirmLabel = 'OK',
    cancelLabel = 'Abbrechen',
    confirmColor = 'critical',
    confirmVariant = 'filled',
  } = options;

  return new Promise<boolean>(resolve => {
    const escapedMessage = message.replace(/\n/g, '<br>');

    let ergebnis = false;
    const { inhalt, schliessen } = erzeugeDbDialog(() => resolve(ergebnis));

    inhalt.innerHTML = `
      <div class="db-drawer-header">
        <h5>${title}</h5>
        <button type="button" class="db-button" data-icon="cross" data-variant="ghost" data-no-text="true" data-bs-dismiss="modal">Schließen</button>
      </div>
      <div class="dialog-koerper"><p>${escapedMessage}</p></div>
      <div class="dialog-fuss">
        <button type="button" class="db-button" data-variant="filled" data-bs-dismiss="modal">${cancelLabel}</button>
        <button type="button" class="db-button" data-variant="${confirmVariant}"${
          confirmColor ? ` data-color="${confirmColor}"` : ''
        } data-confirm="true">${confirmLabel}</button>
      </div>
    `;

    inhalt.querySelector('[data-confirm="true"]')?.addEventListener('click', () => {
      ergebnis = true;
      schliessen();
    });
  });
}
