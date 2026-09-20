import { beforeEach, describe, expect, it, vi } from 'bun:test';

import '@/app/features';
import { openHelpModal } from '@/core/help/openHelpModal';

function getModalEl() {
  return document.body.querySelector<HTMLDialogElement>('dialog.db-drawer');
}

describe('openHelpModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders the resolved help content into a dedicated, stacked modal element', async () => {
    await openHelpModal('tab.ewt');

    const modal = getModalEl();
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('EWT');
    expect(modal?.textContent).toContain('Berechnen');
    expect(modal?.hasAttribute('open')).toBe(true);
  });

  it('does not touch the shared #modal element used by Add/Edit-Modals', async () => {
    document.body.innerHTML = '<div id="modal"><form>bestehende Eingaben</form></div>';

    await openHelpModal('tab.bereitschaft');

    expect(document.querySelector('#modal')?.textContent).toBe('bestehende Eingaben');
  });

  it('räumt den eigenen Dialog beim Schließen wieder ab', async () => {
    await openHelpModal('tab.neben');

    getModalEl()!.querySelector<HTMLButtonElement>('[data-dialog-dismiss="modal"]')!.click();

    expect(getModalEl()).toBeNull();
  });

  it('zeigt bei unbekanntem Schluessel eine Snackbar statt eines Dialogs', async () => {
    await openHelpModal('tab.gibtEsNicht');

    expect(getModalEl()).toBeNull();
  });
});
