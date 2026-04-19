import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { userLoginSuccessMock, setLoadingMock, clearLoadingMock, loginMock, meMock, hideMock, getInstanceMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  userLoginSuccessMock: vi.fn(),
  setLoadingMock: vi.fn(),
  clearLoadingMock: vi.fn(),
  loginMock: vi.fn(),
  meMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

vi.mock('../src/ts/features/Login/utils', () => ({
  userLoginSuccess: userLoginSuccessMock,
}));

vi.mock('../src/ts/infrastructure/ui/setLoading', () => ({
  default: setLoadingMock,
}));

vi.mock('../src/ts/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('../src/ts/infrastructure/api/apiService', () => ({
  authApi: {
    login: loginMock,
    me: meMock,
  },
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import loginUser from '../src/ts/features/Login/utils/loginUser';

function setupDom(): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root">
      <input id="Benutzer" value="otto" />
      <input id="Passwort" value="secret" />
    </div>
    <button id="btnLogin">Login</button>
    <div id="errorMessage"></div>
  `;

  const modal = document.querySelector<HTMLDivElement>('#modal-root');
  if (!modal) throw new Error('modal not found');
  return modal;
}

describe('loginUser', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({ hide: hideMock });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('wirft Fehler wenn Benutzer-Input fehlt', async () => {
    document.body.innerHTML = `<div id="modal-root"></div><div id="errorMessage"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    await expect(loginUser(modal as never)).rejects.toThrow('Benutzer Input nicht gefunden');
  });

  it('zeigt Offline-Fehler und beendet ohne API-Call', async () => {
    const modal = setupDom();
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    await loginUser(modal as never);

    expect(loginMock).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
    expect(clearLoadingMock).toHaveBeenCalledWith('btnLogin', false);
  });

  it('fuehrt Login-Flow inkl. me() und userLoginSuccess aus', async () => {
    const modal = setupDom();
    loginMock.mockResolvedValue(undefined);
    meMock.mockResolvedValue({ role: 'org-admin' });

    await loginUser(modal as never);

    expect(loginMock).toHaveBeenCalledWith('otto', 'secret');
    expect(meMock).toHaveBeenCalledTimes(1);
    expect(getInstanceMock).toHaveBeenCalledWith(modal);
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(userLoginSuccessMock).toHaveBeenCalledWith({
      username: 'otto',
      role: 'org-admin',
      email: undefined,
      emailVerified: undefined,
    });
    expect(clearLoadingMock).toHaveBeenCalledWith('btnLogin', false);
  });

  it('zeigt Fehlermeldung bei API-Fehler und raeumt Loading auf', async () => {
    const modal = setupDom();
    loginMock.mockRejectedValue(new Error('kaputt'));

    await loginUser(modal as never);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.innerHTML).toBe('kaputt');
    expect(clearLoadingMock).toHaveBeenCalledWith('btnLogin', false);
    expect(userLoginSuccessMock).not.toHaveBeenCalled();
  });
});
