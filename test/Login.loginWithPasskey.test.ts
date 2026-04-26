import { beforeEach, describe, expect, it, vi } from 'bun:test';

const userLoginSuccessMock = vi.fn();
const setLoadingMock = vi.fn();
const clearLoadingMock = vi.fn();
const beginPasskeyLoginMock = vi.fn();
const finishPasskeyLoginMock = vi.fn();
const meMock = vi.fn();
const resetTokenStateMock = vi.fn();
const startAuthenticationMock = vi.fn();
const browserSupportsWebAuthnMock = vi.fn();
const hideMock = vi.fn();
const getInstanceMock = vi.fn();

vi.mock('@/core/orchestration/auth/utils', () => ({
  userLoginSuccess: userLoginSuccessMock,
}));

vi.mock('@/infrastructure/ui/setLoading', () => ({
  default: setLoadingMock,
}));

vi.mock('@/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('@/infrastructure/api/apiService', () => ({
  authApi: {
    beginPasskeyLogin: beginPasskeyLoginMock,
    finishPasskeyLogin: finishPasskeyLoginMock,
    me: meMock,
  },
}));

vi.mock('@/infrastructure/tokenManagement/tokenErneuern', () => ({
  resetTokenState: resetTokenStateMock,
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: browserSupportsWebAuthnMock,
  startAuthentication: startAuthenticationMock,
  WebAuthnError: class WebAuthnError extends Error {},
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import loginWithPasskey from '@/core/orchestration/auth/utils/loginWithPasskey';

function setupDom(userName = ''): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root">
      <input id="Benutzer" value="${userName}" />
    </div>
    <button id="btnLogin">Login</button>
    <div id="errorMessage"></div>
  `;

  const modal = document.querySelector<HTMLDivElement>('#modal-root');
  if (!modal) throw new Error('modal not found');
  return modal;
}

describe('loginWithPasskey', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    browserSupportsWebAuthnMock.mockReturnValue(true);
    getInstanceMock.mockReturnValue({ hide: hideMock });
  });

  it('startet bei leerem Benutzernamen trotzdem die explizite Passkey-Abfrage', async () => {
    const modal = setupDom('');
    beginPasskeyLoginMock.mockResolvedValue({
      options: { challenge: 'challenge-1', rpId: 'localhost' },
      challengeToken: 'state-1',
    });
    startAuthenticationMock.mockResolvedValue({ id: 'passkey-cred-1' });
    finishPasskeyLoginMock.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    meMock.mockResolvedValue({ userName: 'otto', role: 'member', email: 'otto@deutschebahn.com', emailVerified: true });

    await loginWithPasskey(modal as never);

    expect(beginPasskeyLoginMock).toHaveBeenCalledWith(undefined);
    expect(startAuthenticationMock).toHaveBeenCalledWith({
      optionsJSON: { challenge: 'challenge-1', rpId: 'localhost' },
      useBrowserAutofill: false,
    });
    expect(finishPasskeyLoginMock).toHaveBeenCalledWith({ id: 'passkey-cred-1' }, 'state-1', undefined);
    expect(resetTokenStateMock).toHaveBeenCalledTimes(1);
    expect(userLoginSuccessMock).toHaveBeenCalledWith({
      username: 'otto',
      role: 'member',
      email: 'otto@deutschebahn.com',
      emailVerified: true,
    });
  });

  it('verwendet bei vorhandenem Benutzernamen den klassischen Passkey-Flow', async () => {
    const modal = setupDom('otto');
    beginPasskeyLoginMock.mockResolvedValue({
      options: { challenge: 'challenge-2', allowCredentials: [{ id: 'passkey-cred-1' }] },
      challengeToken: 'state-2',
      userName: 'otto',
    });
    startAuthenticationMock.mockResolvedValue({ id: 'passkey-cred-1' });
    finishPasskeyLoginMock.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
    meMock.mockResolvedValue({ userName: 'otto', role: 'org-admin' });

    await loginWithPasskey(modal as never);

    expect(beginPasskeyLoginMock).toHaveBeenCalledWith('otto');
    expect(startAuthenticationMock).toHaveBeenCalledWith({
      optionsJSON: { challenge: 'challenge-2', allowCredentials: [{ id: 'passkey-cred-1' }] },
      useBrowserAutofill: false,
    });
    expect(finishPasskeyLoginMock).toHaveBeenCalledWith({ id: 'passkey-cred-1' }, 'state-2', 'otto');
  });
});
