import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { createSnackBarMock, createModalResetPasswordMock, fetchRetryMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  createSnackBarMock: vi.fn(),
  createModalResetPasswordMock: vi.fn(),
  fetchRetryMock: vi.fn(),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/core/orchestration/auth/components', () => ({
  createModalResetPassword: createModalResetPasswordMock,
}));

vi.mock('@/infrastructure/api/FetchRetry', () => ({
  FetchRetry: fetchRetryMock,
}));

import handleAuthUrlState from '@/core/orchestration/auth/utils/handleAuthUrlState';

async function flushAsync(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('handleAuthUrlState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('zeigt Erfolgssnackbar bei verify=success und entfernt Query-Parameter', () => {
    window.history.replaceState({}, '', '/?verify=success&reason=VERIFY_TOKEN_INVALID');

    handleAuthUrlState();

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
      }),
    );
    expect(new URL(window.location.href).searchParams.get('verify')).toBeNull();
    expect(new URL(window.location.href).searchParams.get('reason')).toBeNull();
  });

  it('zeigt Fehlersnackbar bei verify=error und mappt reason', () => {
    window.history.replaceState({}, '', '/?verify=error&reason=VERIFY_TOKEN_EXPIRED');

    handleAuthUrlState();

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('abgelaufen'),
      }),
    );
  });

  it('verwendet Fallback-Text bei unbekanntem verify-Fehlergrund', () => {
    window.history.replaceState({}, '', '/?verify=error&reason=SOMETHING_ELSE');

    handleAuthUrlState();

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('konnte nicht abgeschlossen'),
      }),
    );
  });

  it('oeffnet Reset-Modal bei resetPasswordToken und entfernt den Token aus der URL', () => {
    window.history.replaceState({}, '', '/?resetPasswordToken=test-token-123');

    handleAuthUrlState();

    expect(createModalResetPasswordMock).toHaveBeenCalledWith('test-token-123');
    expect(new URL(window.location.href).searchParams.get('resetPasswordToken')).toBeNull();
  });

  it('macht nichts wenn keine relevanten Query-Parameter gesetzt sind', () => {
    window.history.replaceState({}, '', '/?foo=bar');

    handleAuthUrlState();

    expect(createSnackBarMock).not.toHaveBeenCalled();
    expect(createModalResetPasswordMock).not.toHaveBeenCalled();
    expect(new URL(window.location.href).searchParams.get('foo')).toBe('bar');
  });

  describe('verifyEmailToken (Frontend-Verifizierungs-Flow)', () => {
    it('ruft die API auf, zeigt Erfolgssnackbar und entfernt den Token bei Erfolg', async () => {
      window.history.replaceState({}, '', '/?verifyEmailToken=tok123');
      fetchRetryMock.mockResolvedValue({ data: null, success: true, statusCode: 200 });

      handleAuthUrlState();
      await flushAsync();

      expect(fetchRetryMock).toHaveBeenCalledWith('auth/verify-email/tok123');
      expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
      expect(new URL(window.location.href).searchParams.get('verifyEmailToken')).toBeNull();
    });

    it('zeigt API-Fehlermeldung und entfernt den Token bei definitivem Token-Fehler', async () => {
      window.history.replaceState({}, '', '/?verifyEmailToken=tok123');
      fetchRetryMock.mockResolvedValue({
        data: null,
        success: false,
        statusCode: 400,
        message: 'Verifizierungs-Link ist abgelaufen',
      });

      handleAuthUrlState();
      await flushAsync();

      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: expect.stringContaining('abgelaufen') }),
      );
      expect(new URL(window.location.href).searchParams.get('verifyEmailToken')).toBeNull();
    });

    it('behält den Token bei 426 (App veraltet), damit nach dem Update erneut verifiziert wird', async () => {
      window.history.replaceState({}, '', '/?verifyEmailToken=tok123');
      fetchRetryMock.mockResolvedValue({
        data: null,
        success: false,
        statusCode: 426,
        message: 'Bitte aktualisiere die App auf die neueste Version.',
      });

      handleAuthUrlState();
      await flushAsync();

      expect(createSnackBarMock).not.toHaveBeenCalled();
      expect(new URL(window.location.href).searchParams.get('verifyEmailToken')).toBe('tok123');
    });

    it('behält den Token wenn der API-Call wirft (offline / Server nicht erreichbar)', async () => {
      window.history.replaceState({}, '', '/?verifyEmailToken=tok123');
      fetchRetryMock.mockRejectedValue(new Error('Server nicht Erreichbar'));

      handleAuthUrlState();
      await flushAsync();

      expect(createSnackBarMock).not.toHaveBeenCalled();
      expect(new URL(window.location.href).searchParams.get('verifyEmailToken')).toBe('tok123');
    });
  });
});
