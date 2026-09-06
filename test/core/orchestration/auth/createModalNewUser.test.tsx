import { huelleMock, inputMock } from '../../../reactRender';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';

const { showModalMock, checkNeuerBenutzerMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    showModalMock: vi.fn(),
    checkNeuerBenutzerMock: vi.fn(),
  }),
);

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyFormModal: huelleMock,
  MyModalBody: huelleMock,
  MyInput: inputMock,
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

  it('ruft checkNeuerBenutzer auf, wenn das Formular gültig ist', () => {
    setupShowModalMock(true);
    createModalNewUser();

    const preventDefault = vi.fn();
    getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(getForm().classList.contains('was-validated')).toBe(true);
    expect(checkNeuerBenutzerMock).toHaveBeenCalledTimes(1);
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
