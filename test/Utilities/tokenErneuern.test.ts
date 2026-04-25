import { beforeEach, describe, expect, it, vi } from 'bun:test';

// --- Hoisted mocks ---
const { mockRefreshToken, mockCreateSnackBar, mockAuthFailureHandler } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockRefreshToken: vi.fn(),
  mockCreateSnackBar: vi.fn(),
  mockAuthFailureHandler: vi.fn(),
}));

vi.mock('../../src/ts/infrastructure/api/apiService', () => ({
  authApi: { refreshToken: mockRefreshToken },
}));
vi.mock('../../src/ts/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));

import tokenErneuern, { resetTokenState } from '../../src/ts/infrastructure/tokenManagement/tokenErneuern';
import { registerHook, clearAllHooks } from '../../src/ts/core/hooks';

describe('tokenErneuern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllHooks();
    resetTokenState();
    registerHook('auth:failure', mockAuthFailureHandler);
  });

  it('ruft authApi.refreshToken() auf bei erfolgreichem Refresh', async () => {
    mockRefreshToken.mockResolvedValue(undefined);

    await tokenErneuern(0);
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('wirft Fehler nach zu vielen Retries (retry > 2)', async () => {
    await expect(tokenErneuern(3)).rejects.toThrow('Zu viele Token-Refresh-Versuche');
    expect(mockAuthFailureHandler).toHaveBeenCalled();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('wirft Fehler und loggt aus bei API-Fehler', async () => {
    mockRefreshToken.mockImplementation(async () => {
      throw new Error('Network error');
    });

    await expect(tokenErneuern(0)).rejects.toThrow('Fehler bei Token erneuerung');
    expect(mockAuthFailureHandler).toHaveBeenCalled();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('wirft Fehler wenn REFRESHED-Zähler überschritten', async () => {
    mockRefreshToken.mockResolvedValue(undefined);

    // 3 erfolgreiche Refreshes
    await tokenErneuern(0);
    await tokenErneuern(0);
    await tokenErneuern(0);

    // 4. Versuch sollte fehlschlagen (REFRESHED > 2)
    await expect(tokenErneuern(0)).rejects.toThrow('Zu viele Token-Refresh-Versuche');
    expect(mockAuthFailureHandler).toHaveBeenCalled();
  });
});
