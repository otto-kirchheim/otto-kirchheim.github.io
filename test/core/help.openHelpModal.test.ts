import { beforeEach, describe, expect, it, vi } from 'bun:test';

const showMock = vi.fn();
const disposeMock = vi.fn();
const ModalConstructor = vi.fn(() => ({ show: showMock, dispose: disposeMock }));
vi.mock('bootstrap/js/dist/modal', () => ({ default: ModalConstructor }));

import { openHelpModal } from '@/core/help/openHelpModal';

function getModalEl() {
  return document.body.querySelector<HTMLElement>('.modal');
}

describe('openHelpModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders the resolved help content into a dedicated, stacked modal element', () => {
    openHelpModal('tab.ewt');

    const modal = getModalEl();
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('EWT');
    expect(modal?.textContent).toContain('Berechnen');
    expect(showMock).toHaveBeenCalledTimes(1);
  });

  it('does not touch the shared #modal element used by Add/Edit-Modals', () => {
    document.body.innerHTML = '<div id="modal"><form>bestehende Eingaben</form></div>';

    openHelpModal('tab.bereitschaft');

    expect(document.querySelector('#modal')?.textContent).toBe('bestehende Eingaben');
  });

  it('cleans up the dedicated modal element after hidden.bs.modal', () => {
    openHelpModal('tab.neben');

    const modal = getModalEl()!;
    modal.dispatchEvent(new Event('hidden.bs.modal'));

    expect(disposeMock).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.modal')).toBeNull();
  });
});
