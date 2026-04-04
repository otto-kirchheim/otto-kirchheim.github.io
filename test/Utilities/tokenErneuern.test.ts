import { beforeEach, describe, expect, it, vi } from 'bun:test';

// --- Hoisted mocks ---
const { mockRefreshToken, mockCreateSnackBar, mocklogoutUser } = vi.hoisted(() => ({
  mockRefreshToken: vi.fn(),
  mockCreateSnackBar: vi.fn(),
  mocklogoutUser: vi.fn(),
}));

vi.mock('../../src/ts/utilities/apiService', () => ({
  authApi: { refreshToken: mockRefreshToken },
}));
vi.mock('../../src/ts/class/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('../../src/ts/Einstellungen/utils', () => ({ logoutUser: mocklogoutUser }));

import tokenErneuern, { resetTokenState } from '../../src/ts/utilities/tokenErneuern';

describe('tokenErneuern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTokenState();
  });

  it('ruft authApi.refreshToken() auf bei erfolgreichem Refresh', async () => {
    mockRefreshToken.mockResolvedValue(undefined);

    await tokenErneuern(0);
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('wirft Fehler nach zu vielen Retries (retry > 2)', async () => {
    await expect(tokenErneuern(3)).rejects.toThrow('Zu viele Token-Refresh-Versuche');
    expect(mocklogoutUser).toHaveBeenCalled();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('wirft Fehler und loggt aus bei API-Fehler', async () => {
    mockRefreshToken.mockImplementation(async () => { throw new Error('Network error'); });

    await expect(tokenErneuern(0)).rejects.toThrow('Fehler bei Token erneuerung');
    expect(mocklogoutUser).toHaveBeenCalled();
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
    expect(mocklogoutUser).toHaveBeenCalled();
  });
});
