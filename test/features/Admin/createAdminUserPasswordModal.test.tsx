import { huelleMock, inputMock } from '../../reactRender';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';

const { showModalMock, createSnackBarMock, updateUserPasswordMock, hideMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  updateUserPasswordMock: vi.fn(),
  hideMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  schliesseModal: hideMock,
  showModal: showModalMock,
  MyFormModal: huelleMock,
  MyModalBody: huelleMock,
  MyInput: inputMock,
  PasswordStrengthMeter: () => h('div', {}),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/features/Admin/utils/api', () => ({
  updateUserPassword: updateUserPasswordMock,
}));

import createAdminUserPasswordModal from '@/features/Admin/components/createAdminUserPasswordModal';

function setupShowModalMock(): void {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => true;
    vnode.props.myRef.current = form;

    const modal = document.createElement('div');
    modal.innerHTML = `
      <span id="errorMessage"></span>
      <input id="adminUserPasswordNew" value="" />
      <input id="adminUserPasswordRepeat" value="" />
    `;
    document.body.appendChild(modal);
    return modal;
  });
}

function setPasswords(modal: HTMLElement, neu: string, wiederholt: string): void {
  (modal.querySelector('#adminUserPasswordNew') as HTMLInputElement).value = neu;
  (modal.querySelector('#adminUserPasswordRepeat') as HTMLInputElement).value = wiederholt;
}

describe('createAdminUserPasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupShowModalMock();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  function getSubmit(): (event: Event) => Promise<void> {
    return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
  }

  it('setzt das Passwort und schließt das Modal bei Erfolg', async () => {
    createAdminUserPasswordModal('user-1', 'Max Mustermann');
    const modal = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modal, 'SicheresPasswort1', 'SicheresPasswort1');
    updateUserPasswordMock.mockResolvedValue(undefined);

    const preventDefault = vi.fn();
    await getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(updateUserPasswordMock).toHaveBeenCalledWith('user-1', 'SicheresPasswort1');
    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('zeigt einen Fehler bei zu kurzem Passwort und ruft die API nicht auf', async () => {
    createAdminUserPasswordModal('user-1', 'Max');
    const modal = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modal, 'kurz', 'kurz');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modal.querySelector('#errorMessage')?.textContent).toBe(
      'Das neue Passwort muss mindestens 8 Zeichen lang sein',
    );
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it('zeigt einen Fehler bei nicht übereinstimmenden Passwörtern', async () => {
    createAdminUserPasswordModal('user-1', 'Max');
    const modal = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modal, 'SicheresPasswort1', 'AndersPasswort2');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modal.querySelector('#errorMessage')?.textContent).toBe('Passwörter stimmen nicht überein');
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it('zeigt einen Offline-Fehler und ruft die API nicht auf', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    createAdminUserPasswordModal('user-1', 'Max');
    const modal = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modal, 'SicheresPasswort1', 'SicheresPasswort1');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modal.querySelector('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it('zeigt die API-Fehlermeldung und einen Snackbar bei fehlgeschlagenem Request', async () => {
    createAdminUserPasswordModal('user-1', 'Max');
    const modal = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modal, 'SicheresPasswort1', 'SicheresPasswort1');
    updateUserPasswordMock.mockRejectedValue(new Error('Server nicht erreichbar'));

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modal.querySelector('#errorMessage')?.textContent).toBe('Server nicht erreichbar');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(hideMock).not.toHaveBeenCalled();
  });

  it('bricht ab, wenn das Formular ungültig ist', async () => {
    createAdminUserPasswordModal('user-1', 'Max');
    const vnode = showModalMock.mock.calls[0][0] as { props: { myRef: { current: HTMLFormElement } } };
    vnode.props.myRef.current.checkValidity = () => false;

    const preventDefault = vi.fn();
    await getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });
});
