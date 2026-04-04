import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { createSnackBarMock, clearLoadingMock, registerMock, meMock, userLoginSuccessMock, hideMock, getInstanceMock } =
  vi.hoisted(() => ({
    createSnackBarMock: vi.fn(),
    clearLoadingMock: vi.fn(),
    registerMock: vi.fn(),
    meMock: vi.fn(),
    userLoginSuccessMock: vi.fn(),
    hideMock: vi.fn(),
    getInstanceMock: vi.fn(),
  }));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/utilities', () => ({
  clearLoading: clearLoadingMock,
}));

vi.mock('../src/ts/utilities/apiService', () => ({
  authApi: {
    register: registerMock,
    me: meMock,
  },
}));

vi.mock('../src/ts/Login/utils/userLoginSuccess', () => ({
  default: userLoginSuccessMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import checkNeuerBenutzer from '../src/ts/Login/utils/checkNeuerBenutzer';

function setupDom(): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root"></div>
    <div id="errorMessage"></div>
    <input id="Zugang" value=" code-1 " />
    <input id="Benutzer" value=" otto " />
    <input id="Email" value=" test@example.com " />
    <input id="Passwort" value=" pass1 " />
    <input id="Passwort2" value=" pass1 " />
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

  it('zeigt Offline-Fehler ohne Register-Call', async () => {
    const modal = setupDom();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('fuehrt erfolgreichen Registrierungs-Flow aus', async () => {
    const modal = setupDom();
    registerMock.mockResolvedValue(undefined);
    meMock.mockResolvedValue({ role: 'org-admin' });

    await checkNeuerBenutzer(modal as never);

    expect(registerMock).toHaveBeenCalledWith('otto', 'test@example.com', 'pass1', 'code-1');
    expect(meMock).toHaveBeenCalledTimes(1);
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

  it('zeigt Fehler-Snackbar und schreibt Fehlermeldung bei Fehler', async () => {
    const modal = setupDom();
    registerMock.mockRejectedValue(new Error('register failed'));

    await checkNeuerBenutzer(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.innerHTML).toBe('register failed');
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
      }),
    );
    expect(clearLoadingMock).toHaveBeenCalledWith('btnNeu');
  });
});
