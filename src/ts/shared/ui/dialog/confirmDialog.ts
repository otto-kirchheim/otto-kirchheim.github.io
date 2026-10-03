import { escapeHtml } from '@/shared/lib/autosave/errorHandling';
import { erzeugeDbDialog } from './dbDialog';

export interface ConfirmDialogOptions {
  /** Titel im Modal-Header (default: 'Bestätigung') */
  title?: string;
  /** Text des Bestätigungs-Buttons (default: 'OK') */
  confirmLabel?: string;
  /** Text des Abbrechen-Buttons (default: 'Abbrechen') */
  cancelLabel?: string;
  /** Semantik des Bestätigungs-Buttons (default: 'critical'); steuert `data-color` des DB-Buttons. */
  confirmColor?: 'critical' | 'warning' | 'successful' | 'informational';
  /** Variante des Bestätigungs-Buttons (default: 'filled'). */
  confirmVariant?: 'brand' | 'filled' | 'outlined' | 'ghost';
}

/**
 * Async-Ersatz für `window.confirm()` als DB-Drawer über einem nativen `<dialog>`. `message`, `title`
 * und Labels werden HTML-maskiert (Nutzereingaben wie Benutzernamen sind damit sicher); `\n` wird zu `<br>`.
 *
 * @param message - Dialogtext.
 * @param options - Titel, Button-Beschriftungen und -Look (siehe `ConfirmDialogOptions`).
 * @returns Promise: `true` bei Bestätigung, `false` bei Abbrechen/Schließen/Escape/Hintergrundklick.
 */
export function confirmDialog(message: string, options: ConfirmDialogOptions = {}): Promise<boolean> {
  const {
    title = 'Bestätigung',
    confirmLabel = 'OK',
    cancelLabel = 'Abbrechen',
    confirmColor = 'critical',
    confirmVariant = 'filled',
  } = options;

  return new Promise<boolean>(resolve => {
    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');

    let ergebnis = false;
    const { inhalt, schliessen } = erzeugeDbDialog(() => resolve(ergebnis));

    inhalt.innerHTML = `
      <div class="db-drawer-header">
        <h5>${escapeHtml(title)}</h5>
        <button type="button" class="db-button" data-icon="cross" data-variant="ghost" data-no-text="true" data-dialog-dismiss="modal">Schließen</button>
      </div>
      <div class="dialog-koerper"><p>${escapedMessage}</p></div>
      <div class="dialog-fuss">
        <button type="button" class="db-button" data-variant="filled" data-dialog-dismiss="modal">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="db-button" data-variant="${confirmVariant}"${
          confirmColor ? ` data-color="${confirmColor}"` : ''
        } data-confirm="true">${escapeHtml(confirmLabel)}</button>
      </div>
    `;

    inhalt.querySelector('[data-confirm="true"]')?.addEventListener('click', () => {
      ergebnis = true;
      schliessen();
    });
  });
}
