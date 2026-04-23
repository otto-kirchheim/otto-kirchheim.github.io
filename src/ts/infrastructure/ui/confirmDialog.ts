/**
 * Async Bootstrap-Modal-Ersatz für window.confirm().
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
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');

    const escapedMessage = message.replace(/\n/g, '<br>');

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body"><p>${escapedMessage}</p></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelLabel}</button>
            <button type="button" class="btn ${confirmClass}" data-confirm="true">${confirmLabel}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const bootstrapApi = (
      window as {
        bootstrap?: { Modal?: new (el: Element) => { show: () => void; hide: () => void; dispose: () => void } };
      }
    ).bootstrap;
    if (!bootstrapApi?.Modal) {
      modal.remove();
      resolve(window.confirm(message));
      return;
    }

    const bsModal = new bootstrapApi.Modal(modal);
    let resolved = false;

    const finish = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      bsModal.hide();
      resolve(result);
    };

    modal.querySelector('[data-confirm="true"]')?.addEventListener('click', () => finish(true));
    modal.addEventListener('hidden.bs.modal', () => {
      finish(false);
      modal.remove();
    });

    bsModal.show();
  });
}
