import { beforeEach, describe, expect, it, vi } from 'bun:test';

import { confirmDialog } from '@/infrastructure/ui/confirmDialog';

function getModalEl() {
  return document.body.querySelector<HTMLDialogElement>('dialog.db-drawer');
}

/** Abbrechen/Schliessen -- der Weg, den auch der Nutzer nimmt. */
function abbrechen() {
  document.body.querySelector<HTMLButtonElement>('.dialog-fuss [data-bs-dismiss="modal"]')!.click();
}

describe('confirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('resolves true when confirm button is clicked', async () => {
    const promise = confirmDialog('Wirklich löschen?');

    const confirmBtn = document.body.querySelector<HTMLButtonElement>('[data-confirm="true"]');
    expect(confirmBtn).not.toBeNull();
    confirmBtn!.click();

    const result = await promise;
    expect(result).toBe(true);
    expect(getModalEl()).toBeNull();
  });

  it('resolves false when the dialog is dismissed (cancel / close)', async () => {
    const promise = confirmDialog('Wirklich?');
    abbrechen();
    expect(await promise).toBe(false);
  });

  it('second finish call after confirm is ignored (resolved only once)', async () => {
    const promise = confirmDialog('Doppelt?');

    document.body.querySelector<HTMLButtonElement>('[data-confirm="true"]')!.click();
    // Zweiter Schliessversuch nach dem Bestaetigen darf das Ergebnis nicht mehr aendern.
    getModalEl()?.dispatchEvent(new Event('cancel'));

    expect(await promise).toBe(true);
  });

  it('renders custom title, labels and semantics', async () => {
    confirmDialog('Nachricht', {
      title: 'Mein Titel',
      confirmLabel: 'Ja',
      cancelLabel: 'Nein',
      confirmColor: 'warning',
      confirmVariant: 'brand',
    });

    const modal = getModalEl()!;
    const bestaetigen = modal.querySelector<HTMLButtonElement>('[data-confirm="true"]')!;
    expect(modal.querySelector('.db-drawer-header h5')?.textContent).toBe('Mein Titel');
    expect(bestaetigen.textContent).toBe('Ja');
    expect(modal.querySelector('.dialog-fuss [data-bs-dismiss="modal"]')?.textContent).toBe('Nein');
    expect(bestaetigen.dataset.variant).toBe('brand');
    expect(bestaetigen.dataset.color).toBe('warning');

    abbrechen();
  });

  it('converts newlines in message to <br>', async () => {
    confirmDialog('Zeile1\nZeile2');
    const body = getModalEl()!.querySelector('.dialog-koerper p')!;
    expect(body.innerHTML).toContain('Zeile1<br>Zeile2');
    abbrechen();
  });

  it('entfernt den Dialog aus dem DOM, sobald er geschlossen wird', async () => {
    const promise = confirmDialog('Test');
    abbrechen();
    await promise;
    expect(getModalEl()).toBeNull();
  });
});
