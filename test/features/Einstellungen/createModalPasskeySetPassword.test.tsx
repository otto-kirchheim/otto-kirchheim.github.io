import { huelleMock, inputMock } from '../../reactRender';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';

const {
  showModalMock,
  createSnackBarMock,
  browserSupportsWebAuthnMock,
  startAuthenticationMock,
  beginPasskeyLoginMock,
  setPasswordWithPasskeyMock,
  getUserCookieMock,
  getPasskeyErrorMessageMock,
  resetTokenStateMock,
  hideMock,
  getInstanceMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  browserSupportsWebAuthnMock: vi.fn(),
  startAuthenticationMock: vi.fn(),
  beginPasskeyLoginMock: vi.fn(),
  setPasswordWithPasskeyMock: vi.fn(),
  getUserCookieMock: vi.fn(),
  getPasskeyErrorMessageMock: vi.fn(),
  resetTokenStateMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyFormModal: huelleMock,
  MyModalBody: huelleMock,
  MyInput: inputMock,
  PasswordStrengthMeter: () => h('div', {}),
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: browserSupportsWebAuthnMock,
  startAuthentication: startAuthenticationMock,
}));

vi.mock('@/infrastructure/api/apiService', () => ({
  authApi: {
    beginPasskeyLogin: beginPasskeyLoginMock,
    setPasswordWithPasskey: setPasswordWithPasskeyMock,
  },
}));

vi.mock('@/infrastructure/tokenManagement/decodeAccessToken', () => ({
  getUserCookie: getUserCookieMock,
}));

vi.mock('@/infrastructure/tokenManagement/passkeys', () => ({
  getPasskeyErrorMessage: getPasskeyErrorMessageMock,
}));

vi.mock('@/infrastructure/tokenManagement/tokenErneuern', () => ({
  resetTokenState: resetTokenStateMock,
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: { getInstance: getInstanceMock },
}));

import createModalPasskeySetPassword from '@/features/Einstellungen/components/createModalPasskeySetPassword';

function setupShowModalMock(): void {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => true;
    vnode.props.myRef.current = form;

    const modal = document.createElement('div');
    modal.innerHTML = `
      <span id="errorMessage"></span>
      <input id="PasskeyPasswortNeu" value="" />
      <input id="PasskeyPasswortNeu2" value="" />
    `;
    document.body.appendChild(modal);
    return modal;
  });
}

function setPasswords(modal: HTMLElement, neu: string, wiederholt: string): void {
  (modal.querySelector('#PasskeyPasswortNeu') as HTMLInputElement).value = neu;
  (modal.querySelector('#PasskeyPasswortNeu2') as HTMLInputElement).value = wiederholt;
}

function getSubmit(): (event: Event) => Promise<void> {
  return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
}

describe('createModalPasskeySetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupShowModalMock();
    getInstanceMock.mockReturnValue({ hide: hideMock });
    browserSupportsWebAuthnMock.mockReturnValue(true);
    getUserCookieMock.mockReturnValue({ userName: 'max.mustermann' });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('setzt das Passwort per Passkey-Assertion und zeigt eine Erfolgsmeldung', async () => {
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'SicheresPasswort1');
    beginPasskeyLoginMock.mockResolvedValue({ options: { fake: true }, challengeToken: 'ct-1' });
    startAuthenticationMock.mockResolvedValue({ id: 'cred-1' });
    setPasswordWithPasskeyMock.mockResolvedValue(undefined);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(beginPasskeyLoginMock).toHaveBeenCalledWith('max.mustermann');
    expect(startAuthenticationMock).toHaveBeenCalledWith({ optionsJSON: { fake: true }, useBrowserAutofill: false });
    expect(setPasswordWithPasskeyMock).toHaveBeenCalledWith({ id: 'cred-1' }, 'ct-1', 'SicheresPasswort1');
    expect(resetTokenStateMock).toHaveBeenCalledTimes(1);
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('zeigt einen Fehler bei zu kurzem Passwort und startet keine Passkey-Assertion', async () => {
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'kurz', 'kurz');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modalEl.querySelector('#errorMessage')?.textContent).toContain('mindestens');
    expect(beginPasskeyLoginMock).not.toHaveBeenCalled();
  });

  it('zeigt einen Fehler bei nicht übereinstimmenden Passwörtern', async () => {
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'AndersPasswort2');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modalEl.querySelector('#errorMessage')?.textContent).toBe('Passwörter stimmen nicht überein');
    expect(beginPasskeyLoginMock).not.toHaveBeenCalled();
  });

  it('zeigt einen Fehler, wenn der Browser kein WebAuthn unterstützt', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(false);
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'SicheresPasswort1');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modalEl.querySelector('#errorMessage')?.textContent).toBe(
      'Dieser Browser unterstützt keine Biometrie-Anmeldung.',
    );
    expect(beginPasskeyLoginMock).not.toHaveBeenCalled();
  });

  it('zeigt einen Offline-Fehler', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'SicheresPasswort1');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modalEl.querySelector('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
  });

  it('zeigt einen Fehler, wenn der Benutzername nicht ermittelt werden kann', async () => {
    getUserCookieMock.mockReturnValue(undefined);
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'SicheresPasswort1');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(modalEl.querySelector('#errorMessage')?.textContent).toBe(
      'Benutzer konnte nicht ermittelt werden. Bitte neu anmelden.',
    );
    expect(beginPasskeyLoginMock).not.toHaveBeenCalled();
  });

  it('zeigt die aufbereitete Fehlermeldung, wenn die Passkey-Assertion fehlschlägt', async () => {
    createModalPasskeySetPassword();
    const modalEl = showModalMock.mock.results[0].value as HTMLElement;
    setPasswords(modalEl, 'SicheresPasswort1', 'SicheresPasswort1');
    beginPasskeyLoginMock.mockResolvedValue({ options: {}, challengeToken: 'ct-1' });
    const abortError = new Error('AbortError');
    startAuthenticationMock.mockRejectedValue(abortError);
    getPasskeyErrorMessageMock.mockReturnValue('Vorgang wurde abgebrochen.');

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(getPasskeyErrorMessageMock).toHaveBeenCalledWith(abortError, 'Passwort konnte nicht gesetzt werden');
    expect(modalEl.querySelector('#errorMessage')?.textContent).toBe('Vorgang wurde abgebrochen.');
    expect(hideMock).not.toHaveBeenCalled();
  });
});
