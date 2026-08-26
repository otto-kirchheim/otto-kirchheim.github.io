import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h } from 'preact';

const { showModalMock, checkNeuerBenutzerMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    showModalMock: vi.fn(),
    checkNeuerBenutzerMock: vi.fn(),
  }),
);

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyFormModal: (props: Record<string, unknown>) => h('div', props),
  MyModalBody: (props: Record<string, unknown>) => h('div', props),
  MyInput: (props: Record<string, unknown>) => h('input', props),
  PasswordStrengthMeter: () => h('div', {}),
}));

vi.mock('@/core/orchestration/auth/utils', () => ({
  checkNeuerBenutzer: checkNeuerBenutzerMock,
}));

import createModalNewUser from '@/core/orchestration/auth/components/createModalNewUser';

function setupShowModalMock(checkValidity = true): HTMLDivElement {
  const fakeModal = document.createElement('div');
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => checkValidity;
    vnode.props.myRef.current = form;
    return fakeModal;
  });
  return fakeModal;
}

function getForm(): HTMLFormElement {
  return showModalMock.mock.calls[0][0].props.myRef.current as HTMLFormElement;
}

function getSubmit(): (event: Event) => void {
  return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => void;
}

describe('createModalNewUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ruft checkNeuerBenutzer mit dem Modal auf, wenn das Formular gültig ist', () => {
    const fakeModal = setupShowModalMock(true);
    createModalNewUser();

    const preventDefault = vi.fn();
    getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(getForm().classList.contains('was-validated')).toBe(true);
    expect(checkNeuerBenutzerMock).toHaveBeenCalledWith(fakeModal);
  });

  it('bricht ab und ruft checkNeuerBenutzer nicht auf, wenn das Formular ungültig ist', () => {
    setupShowModalMock(false);
    createModalNewUser();

    const preventDefault = vi.fn();
    getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(getForm().classList.contains('was-validated')).toBe(true);
    expect(checkNeuerBenutzerMock).not.toHaveBeenCalled();
  });
});
