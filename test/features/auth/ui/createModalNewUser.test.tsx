import { huelleMock, inputMock } from '@test/reactRender';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';

const { showModalMock, checkNeuerBenutzerMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    showModalMock: vi.fn(),
    checkNeuerBenutzerMock: vi.fn(),
  }),
);

vi.mock('@/shared/ui/modal/showModal', () => ({ default: showModalMock }));
vi.mock('@/shared/ui/modal/MyFormModal', () => ({ default: huelleMock }));
vi.mock('@/shared/ui/modal/MyModalBody', () => ({ default: huelleMock }));
vi.mock('@/shared/ui/form/MyInput', () => ({ default: inputMock }));
vi.mock('@/shared/ui/form/PasswordStrengthMeter', () => ({ default: () => h('div', {}) }));

vi.mock('@/features/auth/model', () => ({
  checkNeuerBenutzer: checkNeuerBenutzerMock,
}));

import createModalNewUser from '@/features/auth/ui/createModalNewUser';

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
    expect(checkNeuerBenutzerMock).toHaveBeenCalledTimes(1);
  });

  it('bricht ab und ruft checkNeuerBenutzer nicht auf, wenn das Formular ungültig ist', () => {
    setupShowModalMock(false);
    createModalNewUser();

    const preventDefault = vi.fn();
    getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(checkNeuerBenutzerMock).not.toHaveBeenCalled();
  });
});
