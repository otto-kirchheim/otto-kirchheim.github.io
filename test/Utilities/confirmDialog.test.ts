import { beforeEach, describe, expect, it, vi } from 'bun:test';

const showMock = vi.fn();
const hideMock = vi.fn();
const disposeMock = vi.fn();
const ModalConstructor = vi.fn(() => ({ show: showMock, hide: hideMock, dispose: disposeMock }));
vi.mock('bootstrap/js/dist/modal', () => ({ default: ModalConstructor }));

import { confirmDialog } from '@/infrastructure/ui/confirmDialog';

function getModalEl() {
  return document.body.querySelector<HTMLElement>('.modal');
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
    expect(hideMock).toHaveBeenCalled();
  });

  it('resolves false when hidden.bs.modal fires (cancel / close)', async () => {
    const promise = confirmDialog('Wirklich?');
    getModalEl()!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(await promise).toBe(false);
  });

  it('second finish call after confirm is ignored (resolved only once)', async () => {
    const promise = confirmDialog('Doppelt?');

    document.body.querySelector<HTMLButtonElement>('[data-confirm="true"]')!.click();
    getModalEl()!.dispatchEvent(new Event('hidden.bs.modal'));

    expect(await promise).toBe(true);
    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('renders custom title, labels and class', async () => {
    confirmDialog('Nachricht', {
      title: 'Mein Titel',
      confirmLabel: 'Ja',
      cancelLabel: 'Nein',
      confirmClass: 'btn-warning',
    });

    const modal = getModalEl()!;
    expect(modal.querySelector('.modal-title')?.textContent).toBe('Mein Titel');
    expect(modal.querySelector('[data-confirm="true"]')?.textContent).toBe('Ja');
    expect(modal.querySelector('.modal-footer [data-bs-dismiss="modal"]')?.textContent).toBe('Nein');
    expect(modal.querySelector('[data-confirm="true"]')?.classList.contains('btn-warning')).toBe(true);

    modal.dispatchEvent(new Event('hidden.bs.modal'));
  });

  it('converts newlines in message to <br>', async () => {
    confirmDialog('Zeile1\nZeile2');
    const body = getModalEl()!.querySelector('.modal-body p')!;
    expect(body.innerHTML).toContain('Zeile1<br>Zeile2');
    getModalEl()!.dispatchEvent(new Event('hidden.bs.modal'));
  });

  it('removes modal element after hidden.bs.modal', async () => {
    const promise = confirmDialog('Test');
    const modal = getModalEl()!;
    modal.dispatchEvent(new Event('hidden.bs.modal'));
    await promise;
    expect(document.body.querySelector('.modal')).toBeNull();
  });
});
