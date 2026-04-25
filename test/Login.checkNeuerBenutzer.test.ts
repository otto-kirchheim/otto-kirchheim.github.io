import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  createSnackBarMock,
  clearLoadingMock,
  registerMock,
  meMock,
  userLoginSuccessMock,
  hideMock,
  getInstanceMock,
  registerPasskeyWithResultMock,
  resetTokenStateMock,
  confirmMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createSnackBarMock: vi.fn(),
  clearLoadingMock: vi.fn(),
  registerMock: vi.fn(),
  meMock: vi.fn(),
  userLoginSuccessMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
  registerPasskeyWithResultMock: vi.fn(),
  resetTokenStateMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('../src/ts/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('../src/ts/infrastructure/api/apiService', () => ({
  authApi: {
    register: registerMock,
    me: meMock,
  },
}));

vi.mock('../src/ts/core/orchestration/auth/utils/userLoginSuccess', () => ({
  default: userLoginSuccessMock,
}));

vi.mock('../src/ts/infrastructure/tokenManagement/passkeys', () => ({
  registerPasskeyWithResult: registerPasskeyWithResultMock,
}));

vi.mock('../src/ts/infrastructure/tokenManagement/tokenErneuern', () => ({
  resetTokenState: resetTokenStateMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import checkNeuerBenutzer from '../src/ts/core/orchestration/auth/utils/checkNeuerBenutzer';

function setupDom(): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root"></div>
    <div id="errorMessage"></div>
    <input id="Zugang" value=" code-1 " />
    <input id="Benutzer" value=" otto " />
    <input id="Email" value=" test@example.com " />
    <input id="Passwort" value=" pass12345 " />
    <input id="Passwort2" value=" pass12345 " />
  `;

  const modal = document.querySelector<HTMLDivElement>('#modal-root');
  if (!modal) throw new Error('modal not found');
  return modal;
}

describe('checkNeuerBenutzer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({ hide: hideMock });
    confirmMock.mockReturnValue(false);
    window.confirm = confirmMock as typeof window.confirm;
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: class PublicKeyCredentialMock {},
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('wirft Fehler wenn errorMessage fehlt', async () => {
    document.body.innerHTML = `<div id="modal-root"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    await expect(checkNeuerBenutzer(modal as never)).rejects.toThrow('errorMessage not found');
  });

  it('setzt Validierungsfehler wenn Zugangscode fehlt', async () => {
    document.body.innerHTML = `<div id="modal-root"></div><div id="errorMessage"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Bitte Zugangscode Eingeben');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('setzt Validierungsfehler bei ungleichen Passwoertern', async () => {
    setupDom();
    const passwort2 = document.querySelector<HTMLInputElement>('#Passwort2');
    if (!passwort2) throw new Error('passwort2 not found');
    passwort2.value = 'anderes';
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Passwörter falsch wiederholt');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('setzt Validierungsfehler bei zu kurzem Passwort', async () => {
    setupDom();
    const passwort1 = document.querySelector<HTMLInputElement>('#Passwort');
    const passwort2 = document.querySelector<HTMLInputElement>('#Passwort2');
    if (!passwort1 || !passwort2) throw new Error('password inputs not found');
    passwort1.value = 'kurz';
    passwort2.value = 'kurz';
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe(
      'Das Passwort muss mindestens 8 Zeichen lang sein',
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('zeigt Offline-Fehler ohne Register-Call', async () => {
    const modal = setupDom();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('fuehrt erfolgreichen Registrierungs-Flow mit Skip der Passkey-Einrichtung aus', async () => {
    const modal = setupDom();
    registerMock.mockResolvedValue(undefined);
    meMock.mockResolvedValue({ role: 'org-admin' });

    await checkNeuerBenutzer(modal as never);

    expect(registerMock).toHaveBeenCalledWith('otto', 'test@example.com', 'pass12345', 'code-1');
    expect(resetTokenStateMock).toHaveBeenCalledTimes(1);
    expect(meMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(registerPasskeyWithResultMock).not.toHaveBeenCalled();
    expect(getInstanceMock).toHaveBeenCalledWith(modal);
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    expect(userLoginSuccessMock).toHaveBeenCalledWith({
      username: 'otto',
      role: 'org-admin',
      email: undefined,
      emailVerified: undefined,
    });
    expect(clearLoadingMock).toHaveBeenCalledWith('btnNeu');
  });

  it('richtet auf Wunsch direkt einen Passkey nach dem Signup ein', async () => {
    const modal = setupDom();
    registerMock.mockResolvedValue(undefined);
    meMock.mockResolvedValue({ role: 'member', email: 'test@example.com', emailVerified: false });
    confirmMock.mockReturnValue(true);
    registerPasskeyWithResultMock.mockResolvedValue({
      ok: true,
      reason: 'success',
      message: 'Passkey erfolgreich eingerichtet',
    });

    await checkNeuerBenutzer(modal as never);

    expect(registerPasskeyWithResultMock).toHaveBeenCalledTimes(1);
    expect(userLoginSuccessMock).toHaveBeenCalledWith({
      username: 'otto',
      role: 'member',
      email: 'test@example.com',
      emailVerified: false,
    });
  });

  it('bietet bei technischem Passkey-Fehler einen Retry an', async () => {
    const modal = setupDom();
    registerMock.mockResolvedValue(undefined);
    meMock.mockResolvedValue({ role: 'member' });
    confirmMock.mockReturnValueOnce(true).mockReturnValueOnce(true);
    registerPasskeyWithResultMock
      .mockResolvedValueOnce({ ok: false, reason: 'error', message: 'Passkey fehlgeschlagen' })
      .mockResolvedValueOnce({ ok: true, reason: 'success', message: 'Passkey erfolgreich eingerichtet' });

    await checkNeuerBenutzer(modal as never);

    expect(registerPasskeyWithResultMock).toHaveBeenCalledTimes(2);
    expect(confirmMock).toHaveBeenCalledTimes(2);
    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('zeigt Fehler-Snackbar und schreibt Fehlermeldung bei Fehler', async () => {
    const modal = setupDom();
    registerMock.mockRejectedValue(new Error('<img src=x onerror=alert(1)>'));

    await checkNeuerBenutzer(modal as never);

    const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
    expect(errorMessage?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(errorMessage?.querySelector('img')).toBeNull();
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Fehler bei Benutzerstellung.',
      }),
    );
    expect(clearLoadingMock).toHaveBeenCalledWith('btnNeu');
  });
});
