import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { createSnackBarMock, createModalResetPasswordMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  createSnackBarMock: vi.fn(),
  createModalResetPasswordMock: vi.fn(),
}));

vi.mock('../src/ts/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/core/orchestration/auth/components', () => ({
  createModalResetPassword: createModalResetPasswordMock,
}));

import handleAuthUrlState from '../src/ts/core/orchestration/auth/utils/handleAuthUrlState';

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
});
