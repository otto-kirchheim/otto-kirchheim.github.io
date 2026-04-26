import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { loginUserMock, loginWithPasskeyMock, showMock, getOrCreateInstanceMock, browserSupportsWebAuthnMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  loginUserMock: vi.fn(),
  loginWithPasskeyMock: vi.fn(),
  showMock: vi.fn(),
  getOrCreateInstanceMock: vi.fn(),
  browserSupportsWebAuthnMock: vi.fn(),
}));

vi.mock('@/core/orchestration/auth/utils', () => ({
  loginUser: loginUserMock,
  loginWithPasskey: loginWithPasskeyMock,
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: browserSupportsWebAuthnMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getOrCreateInstance: getOrCreateInstanceMock,
  },
}));

import createModalLogin from '@/core/orchestration/auth/components/createModalLogin';

describe('createModalLogin', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="modal"></div>';
    vi.clearAllMocks();
    getOrCreateInstanceMock.mockReturnValue({ show: showMock });
    browserSupportsWebAuthnMock.mockReturnValue(true);
  });

  it('rendert die gruppierten Login-Aktionen und hält die Buttons funktionsfähig', () => {
    createModalLogin();

    const modal = document.querySelector<HTMLDivElement>('#modal');
    if (!modal) throw new Error('modal not found');

    expect(modal.textContent).toContain('Alternative Anmeldung');
    expect(modal.textContent).toContain('Mit Passkey');
    expect(modal.textContent).toContain('Weitere Optionen');
    expect(modal.textContent).toContain('Passwort vergessen');
    expect(modal.textContent).toContain('Registrieren');

    const benutzer = modal.querySelector<HTMLInputElement>('#Benutzer');
    const passwort = modal.querySelector<HTMLInputElement>('#Passwort');
    const passkeyButton = Array.from(modal.querySelectorAll('button')).find(
      button => button.textContent === 'Mit Passkey',
    );
    const form = modal.querySelector<HTMLFormElement>('form');

    if (!benutzer || !passwort || !passkeyButton || !form) {
      throw new Error('Login-Modal ist unvollständig gerendert');
    }

    benutzer.value = 'otto';
    passwort.value = 'pass1';

    passkeyButton.click();
    expect(loginWithPasskeyMock).toHaveBeenCalledWith(modal);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(loginUserMock).toHaveBeenCalledWith(modal);
  });

  it('blendet die alternative Passkey-Anmeldung ohne WebAuthn-Unterstützung aus', () => {
    browserSupportsWebAuthnMock.mockReturnValue(false);

    createModalLogin();

    const modal = document.querySelector<HTMLDivElement>('#modal');
    if (!modal) throw new Error('modal not found');

    expect(modal.textContent).not.toContain('Alternative Anmeldung');
    expect(modal.textContent).not.toContain('Mit Passkey');
    expect(modal.textContent).toContain('Weitere Optionen');
  });
});
