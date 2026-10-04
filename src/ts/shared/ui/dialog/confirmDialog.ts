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
 * Async-Ersatz für `window.confirm()` als DB-Dialog (Handy: Vollbild-Drawer) über einem nativen `<dialog>`. `message`, `title`
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
    const { inhalt, fuss, schliessen } = erzeugeDbDialog(() => resolve(ergebnis), {
      titel: title,
      containerSize: 'small',
    });

    inhalt.innerHTML = `<p>${escapedMessage}</p>`;
    fuss.innerHTML = `
      <button type="button" class="db-button" data-variant="filled" data-dialog-dismiss="modal">${escapeHtml(cancelLabel)}</button>
      <button type="button" class="db-button" data-variant="${confirmVariant}"${
        confirmColor ? ` data-color="${confirmColor}"` : ''
      } data-confirm="true">${escapeHtml(confirmLabel)}</button>
    `;

    fuss.querySelector('[data-confirm="true"]')?.addEventListener('click', () => {
      ergebnis = true;
      schliessen();
    });
  });
}
