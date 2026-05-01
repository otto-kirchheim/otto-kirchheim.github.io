import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';

function makeMockBootstrap() {
  const bsModal = { show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
  const ModalConstructor = vi.fn(() => bsModal);
  Object.assign(window, { bootstrap: { Modal: ModalConstructor } });
  return { bsModal, ModalConstructor };
}

function getModalEl() {
  return document.body.querySelector<HTMLElement>('.modal');
}

describe('confirmDialog – bootstrap fallback', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).bootstrap = undefined;
    document.body.innerHTML = '';
  });

  it('falls back to window.confirm when bootstrap is absent (true)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const result = await confirmDialog('Sicher?');
    expect(result).toBe(true);
    expect(getModalEl()).toBeNull();
  });

  it('falls back to window.confirm when bootstrap is absent (false)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const result = await confirmDialog('Sicher?');
    expect(result).toBe(false);
  });
});

describe('confirmDialog – mit Bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    makeMockBootstrap();
  });

  it('resolves true when confirm button is clicked', async () => {
    const { bsModal } = makeMockBootstrap();
    const promise = confirmDialog('Wirklich löschen?');

    const confirmBtn = document.body.querySelector<HTMLButtonElement>('[data-confirm="true"]');
    expect(confirmBtn).not.toBeNull();
    confirmBtn!.click();

    const result = await promise;
    expect(result).toBe(true);
    expect(bsModal.hide).toHaveBeenCalled();
  });

  it('resolves false when hidden.bs.modal fires (cancel / close)', async () => {
    const promise = confirmDialog('Wirklich?');
    getModalEl()!.dispatchEvent(new Event('hidden.bs.modal'));
    expect(await promise).toBe(false);
  });

  it('second finish call after confirm is ignored (resolved only once)', async () => {
    const { bsModal } = makeMockBootstrap();
    const promise = confirmDialog('Doppelt?');

    document.body.querySelector<HTMLButtonElement>('[data-confirm="true"]')!.click();
    getModalEl()!.dispatchEvent(new Event('hidden.bs.modal'));

    expect(await promise).toBe(true);
    expect(bsModal.hide).toHaveBeenCalledTimes(1);
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
