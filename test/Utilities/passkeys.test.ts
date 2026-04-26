import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { FakeWebAuthnError, browserSupportsWebAuthnMock, startRegistrationMock, createSnackBarMock, authApiMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => {
  class FakeWebAuthnError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WebAuthnError';
    }
  }
  return {
    FakeWebAuthnError,
    browserSupportsWebAuthnMock: vi.fn(),
    startRegistrationMock: vi.fn(),
    createSnackBarMock: vi.fn(),
    authApiMock: {
      beginPasskeyRegistration: vi.fn(),
      finishPasskeyRegistration: vi.fn(),
    },
  };
});

vi.mock('@simplewebauthn/browser', () => ({
  WebAuthnError: FakeWebAuthnError,
  browserSupportsWebAuthn: browserSupportsWebAuthnMock,
  startRegistration: startRegistrationMock,
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/api/apiService', () => ({
  authApi: authApiMock,
}));

import {
  getPasskeyErrorMessage,
  guessPasskeyDeviceName,
  registerPasskeyWithResult,
} from '@/infrastructure/tokenManagement/passkeys';

// ─── getPasskeyErrorMessage ──────────────────────────────────────────────────

describe('getPasskeyErrorMessage', () => {
  it('gibt Abbruch-Meldung für DOMException AbortError zurück', () => {
    const err = new DOMException('', 'AbortError');
    expect(getPasskeyErrorMessage(err)).toBe('Passkey-Vorgang wurde abgebrochen.');
  });

  it('gibt Abbruch-Meldung für Error mit name AbortError zurück', () => {
    const err = new Error('abort');
    err.name = 'AbortError';
    expect(getPasskeyErrorMessage(err)).toBe('Passkey-Vorgang wurde abgebrochen.');
  });

  it('gibt error.message für WebAuthnError zurück', () => {
    const err = new FakeWebAuthnError('WebAuthn fehlgeschlagen');
    expect(getPasskeyErrorMessage(err)).toBe('WebAuthn fehlgeschlagen');
  });

  it('gibt error.message für regulären Error zurück', () => {
    const err = new Error('Netzwerkfehler');
    expect(getPasskeyErrorMessage(err)).toBe('Netzwerkfehler');
  });

  it('gibt Standard-Fallback für unbekannte Fehler zurück', () => {
    expect(getPasskeyErrorMessage('kein Error-Objekt')).toBe('Passkey konnte nicht eingerichtet werden');
  });

  it('gibt benutzerdefinierten Fallback zurück', () => {
    expect(getPasskeyErrorMessage({}, 'Mein Fallback')).toBe('Mein Fallback');
  });
});

// ─── guessPasskeyDeviceName ──────────────────────────────────────────────────

describe('guessPasskeyDeviceName', () => {
  function setUA(ua: string) {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  }

  it('erkennt iPhone', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)');
    expect(guessPasskeyDeviceName()).toBe('Apple-Gerät');
  });

  it('erkennt iPad', () => {
    setUA('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)');
    expect(guessPasskeyDeviceName()).toBe('Apple-Gerät');
  });

  it('erkennt Android', () => {
    setUA('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36');
    expect(guessPasskeyDeviceName()).toBe('Android-Gerät');
  });

  it('erkennt macOS', () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    expect(guessPasskeyDeviceName()).toBe('Mac');
  });

  it('erkennt Windows', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(guessPasskeyDeviceName()).toBe('Windows-PC');
  });

  it('erkennt Linux', () => {
    setUA('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    expect(guessPasskeyDeviceName()).toBe('Linux-Gerät');
  });

  it('gibt Dieses Gerät für unbekannten User-Agent zurück', () => {
    setUA('UnknownBrowser/1.0');
    expect(guessPasskeyDeviceName()).toBe('Dieses Gerät');
  });
});

// ─── registerPasskeyWithResult ───────────────────────────────────────────────

describe('registerPasskeyWithResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gibt unsupported zurück wenn Browser kein WebAuthn unterstützt', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(false);
    const result = await registerPasskeyWithResult();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('zeigt keinen Toast wenn showUnsupportedToast: false', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(false);
    const result = await registerPasskeyWithResult({ showUnsupportedToast: false });
    expect(result.reason).toBe('unsupported');
    expect(createSnackBarMock).not.toHaveBeenCalled();
  });

  it('gibt success zurück bei erfolgreichem Flow', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(true);
    authApiMock.beginPasskeyRegistration.mockResolvedValue({});
    startRegistrationMock.mockResolvedValue({ id: 'cred-1' });
    authApiMock.finishPasskeyRegistration.mockResolvedValue(undefined);

    const result = await registerPasskeyWithResult();
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('success');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('gibt cancelled zurück bei AbortError', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(true);
    authApiMock.beginPasskeyRegistration.mockResolvedValue({});
    const abort = new DOMException('', 'AbortError');
    startRegistrationMock.mockRejectedValue(abort);

    const result = await registerPasskeyWithResult();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cancelled');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('gibt error zurück bei regulärem Fehler', async () => {
    browserSupportsWebAuthnMock.mockReturnValue(true);
    authApiMock.beginPasskeyRegistration.mockRejectedValue(new Error('Serverfehler'));

    const result = await registerPasskeyWithResult();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.message).toBe('Serverfehler');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'danger' }));
  });
});
