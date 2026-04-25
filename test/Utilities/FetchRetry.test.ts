import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createSnackBar } from '../../src/ts/infrastructure/ui/CustomSnackbar';
import Storage from '../../src/ts/infrastructure/storage/Storage';
import tokenErneuern from '../../src/ts/infrastructure/tokenManagement/tokenErneuern';
import { API_URL, FetchRetry, getServerUrl } from '../../src/ts/infrastructure/api/FetchRetry';

// --- Mocks ---

// Mock fetch
globalThis.fetch = vi.fn() as unknown as typeof fetch;

// Mock Storage module (which uses localStorage)
vi.mock('../../src/ts/infrastructure/storage/Storage', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    check: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock createSnackBar
vi.mock('../../src/ts/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: vi.fn(() => ({ Close: vi.fn() })), // Mock Close method as well
}));

// Mock getValidAccesstoken — ENTFERNT (wird nicht mehr verwendet)

// Mock tokenErneuern
vi.mock('../../src/ts/infrastructure/tokenManagement/tokenErneuern', () => ({
  default: vi.fn(),
}));

// Mock abortController (if needed, though FetchRetry uses its own for timeout)
vi.mock('../../src/ts/infrastructure/api/abortController', () => ({
  abortController: {
    signal: new AbortController().signal, // Provide a default signal
    reset: vi.fn(),
  },
}));

// Mock Date.now for consistent time checks
const MOCK_DATE_NOW = 1678886400000; // Example timestamp
vi.spyOn(Date, 'now').mockImplementation(() => MOCK_DATE_NOW);

// --- Test Suites ---

describe('FetchRetry.ts', () => {
  const mockServerConfigs = API_URL; // Use the actual config from the file
  const primaryServerUrl = mockServerConfigs[0].url;
  const secondaryServerUrl = mockServerConfigs[1].url;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockImplementation(() => MOCK_DATE_NOW);
    sessionStorage.clear();
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
    // Default fetch mock (can be overridden in specific tests)
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      blob: async () => new Blob(['test']),
      headers: new Headers(),
    });
    // Default Storage mocks
    (Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (Storage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    // Default token mocks
    (tokenErneuern as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // --- getServerUrl Tests ---
  describe('getServerUrl', () => {
    it('should return currentServerUrl if last contact was recent', async () => {
      const recentTime = (Date.now() - 1 * 60 * 1000).toString(); // 1 minute ago
      sessionStorage.setItem('lastServerContact', recentTime);
      sessionStorage.setItem('currentServerUrl', secondaryServerUrl); // Use secondary to test it's preferred

      const url = await getServerUrl();

      expect(url).toBe(secondaryServerUrl);
      expect(globalThis.fetch).not.toHaveBeenCalled(); // Should not check connection
      expect(createSnackBar).not.toHaveBeenCalled();
    });

    it('should return defaultServerUrl if last contact was recent but currentServerUrl is missing', async () => {
      const recentTime = (Date.now() - 1 * 60 * 1000).toString(); // 1 minute ago
      sessionStorage.setItem('lastServerContact', recentTime);
      // No currentServerUrl set

      const url = await getServerUrl();

      expect(url).toBe(primaryServerUrl); // Falls back to the first URL in the config
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(createSnackBar).not.toHaveBeenCalled();
    });

    it('should check and return the first server if it connects (no recent contact)', async () => {
      sessionStorage.setItem('lastServerContact', '0'); // Very old contact

      // Mock fetch to succeed only for the first server check
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
        if (url === `${primaryServerUrl}/`) {
          return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
        }
        throw new Error('Network error'); // Fail other requests
      });

      const url = await getServerUrl();

      expect(url).toBe(primaryServerUrl);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(`${primaryServerUrl}/`, expect.objectContaining({ method: 'GET' }));
      expect(sessionStorage.getItem('currentServerUrl')).toBe(primaryServerUrl);
      expect(sessionStorage.getItem('lastServerContact')).toBe(MOCK_DATE_NOW.toString());
      expect(createSnackBar).toHaveBeenCalledTimes(1); // For "connecting..."
    });

    it('should check first, fail, then check and return the second server if it connects', async () => {
      sessionStorage.setItem('lastServerContact', '0'); // Very old contact

      // Mock fetch to fail for the first server, succeed for the second
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
        if (url === `${primaryServerUrl}/`) {
          throw new Error('Timeout or network error');
        } else if (url === `${secondaryServerUrl}/`) {
          return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
        }
        throw new Error('Unexpected URL');
      });

      const url = await getServerUrl();

      expect(url).toBe(secondaryServerUrl);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenCalledWith(`${primaryServerUrl}/`, expect.objectContaining({ method: 'GET' }));
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${secondaryServerUrl}/`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(sessionStorage.getItem('currentServerUrl')).toBe(secondaryServerUrl);
      expect(sessionStorage.getItem('lastServerContact')).toBe(MOCK_DATE_NOW.toString());
      expect(createSnackBar).toHaveBeenCalledTimes(1); // For "connecting..."
    });

    it('should throw an error and show snackbar if no servers connect', async () => {
      sessionStorage.setItem('lastServerContact', '0'); // Very old contact

      // Mock fetch to fail for all server checks
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'));

      await expect(getServerUrl()).rejects.toThrow('Server nicht Erreichbar');

      expect(globalThis.fetch).toHaveBeenCalledTimes(mockServerConfigs.length); // Called for each server
      expect(sessionStorage.getItem('currentServerUrl')).toBeNull();
      expect(sessionStorage.getItem('lastServerContact')).toBe('0'); // Should not be updated
      expect(createSnackBar).toHaveBeenCalledTimes(2); // Once for "connecting", once for "error"
      expect(createSnackBar).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ message: expect.stringContaining('aufgebaut') }),
      );
      expect(createSnackBar).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ message: 'Server nicht Erreichbar' }),
      );
    });

    // checkServerConnection timeout test (integrated into getServerUrl)
    it('should handle timeout correctly during server check', async () => {
      vi.useFakeTimers();
      sessionStorage.setItem('lastServerContact', '0');

      // Mock fetch to delay longer than the timeout for the first server
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async (url: string, options: RequestInit) => {
          if (url === `${primaryServerUrl}/`) {
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => resolve({ ok: false }), mockServerConfigs[0].timeout + 100); // Resolve late
              options.signal?.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new DOMException('Aborted', 'AbortError')); // Simulate abort
              });
            });
            // This part should not be reached if abort works
            return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
          } else if (url === `${secondaryServerUrl}/`) {
            // Second server connects quickly
            return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
          }
          throw new Error('Unexpected URL');
        },
      );

      const promise = getServerUrl();
      await (vi as typeof vi & { advanceTimersByTimeAsync: (ms: number) => Promise<void> }).advanceTimersByTimeAsync(
        mockServerConfigs[0].timeout + 50,
      ); // Advance time past the first timeout
      const url = await promise; // Let the second fetch complete

      expect(url).toBe(secondaryServerUrl);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(sessionStorage.getItem('currentServerUrl')).toBe(secondaryServerUrl);

      vi.useRealTimers();
    });
  });

  // --- FetchRetry Tests ---
  describe('FetchRetry', () => {
    const testPath = 'test/endpoint';
    const testData = { key: 'value' };
    const mockSuccessResponse = { data: { result: 'ok' }, success: true, statusCode: 200, message: 'Success' };
    const mockErrorResponse = { data: null, success: false, statusCode: 500, message: 'Internal Server Error' };
    const mockTokenExpiredResponse = {
      data: null,
      success: false,
      statusCode: 401,
      message: 'Token ungültig oder abgelaufen',
    };

    beforeEach(() => {
      // Ensure getServerUrl doesn't perform checks during these specific tests
      sessionStorage.setItem('lastServerContact', (Date.now() - 1000).toString()); // Set last contact to 1 second ago
    });

    it('should perform a successful GET request', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      const result = await FetchRetry(testPath, undefined, 'GET');

      expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${primaryServerUrl}/${testPath}`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should perform a successful POST request with data', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      const result = await FetchRetry(testPath, testData, 'POST');

      expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${primaryServerUrl}/${testPath}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.any(Headers),
        }),
      );
      expect(
        (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].headers.get('Content-Type'),
      ).toBe('application/json');
    });

    it('should not attach Authorization header on public auth routes', async () => {
      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) => key === 'AccessToken');
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return 'public-token';
        return null;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry(
        'auth/register',
        { userName: 'u', password: 'p', email: 'u@deutschebahn.com', accessCode: 'x' },
        'POST',
      );

      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('Authorization')).toBeNull();
    });

    it('should attach Authorization header on protected routes when token exists', async () => {
      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) => key === 'AccessToken');
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return 'protected-token';
        return null;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry('auth/me', undefined, 'GET');

      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer protected-token');
    });

    it('should attach Authorization header on auth/resend-verification-email', async () => {
      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) => key === 'AccessToken');
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return 'protected-token';
        return null;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry('auth/resend-verification-email', { email: 'user@deutschebahn.com' }, 'POST');

      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer protected-token');
    });

    it('should attach Authorization header on auth/logout', async () => {
      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) => key === 'AccessToken');
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return 'protected-token';
        return null;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry('auth/logout', undefined, 'POST');

      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer protected-token');
    });

    it('should attach the act-as header on legacy save routes', async () => {
      localStorage.setItem('actAsUserId', JSON.stringify('user-123'));
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry('saveData', { Monat: 3, Jahr: 2026 }, 'POST');

      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('x-act-as-user-id')).toBe('user-123');
    });

    it('should handle fetch error', async () => {
      const fetchMessage = 'Network Failed';
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
        throw new Error(fetchMessage);
      });

      await expect(FetchRetry(testPath, undefined, 'GET')).rejects.toThrow(
        `Fetch-Fehler: ${fetchMessage}. URL: ${primaryServerUrl}/${testPath}, Method: GET, Retry: 0`,
      );
    });

    it('should handle non-ok response', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse, // Assume server still returns JSON on error
        headers: new Headers(),
      });

      const result = await FetchRetry(testPath, undefined, 'GET');

      expect(result).toEqual({ ...mockErrorResponse, statusCode: 500 }); // Should return the error response structure
    });

    it('should retry with token refresh if 401 Token response', async () => {
      // First call: Token expired
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => mockTokenExpiredResponse,
          headers: new Headers(),
        }) // Second call (after cookie refresh): Success
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        });

      (tokenErneuern as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await FetchRetry(testPath, undefined, 'GET');

      expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(tokenErneuern).toHaveBeenCalledTimes(1);
      expect(tokenErneuern).toHaveBeenCalledWith(0);
      // Retry-Request soll ohne credentials laufen (Bearer statt Cookie)
      expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1].method).toBe('GET');
    });

    it('should also retry with token refresh for generic 401 session errors on protected routes', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            data: null,
            success: false,
            statusCode: 401,
            message: 'Session ungültig oder abgemeldet',
          }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        });

      (tokenErneuern as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await FetchRetry('auth/me', undefined, 'GET');

      expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
      expect(tokenErneuern).toHaveBeenCalledTimes(1);
      expect(tokenErneuern).toHaveBeenCalledWith(0);
    });

    it('should throw error if token refresh fails during retry', async () => {
      const refreshMessage = 'Refresh failed';
      // First call: Token expired
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockTokenExpiredResponse,
        headers: new Headers(),
      });

      (tokenErneuern as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
        throw new Error(refreshMessage);
      });

      // Expect the error thrown by tokenErneuern to propagate
      await expect(FetchRetry(testPath, undefined, 'GET')).rejects.toThrow(
        `Fetch-Fehler: ${refreshMessage}. URL: ${primaryServerUrl}/${testPath}, Method: GET, Retry: 0`,
      );

      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Only the first call
      expect(tokenErneuern).toHaveBeenCalledTimes(1);
    });

    it('should throw error if retry limit is exceeded', async () => {
      await expect(FetchRetry(testPath, undefined, 'GET', 3)).rejects.toThrow('Zu viele Tokenfehler');
      expect(globalThis.fetch).not.toHaveBeenCalled(); // Should throw before fetching
    });

    it('should de-duplicate parallel login requests with identical payload', async () => {
      const deferred = Promise.withResolvers<{
        ok: boolean;
        status: number;
        json: () => Promise<unknown>;
        headers: Headers;
      }>();

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => deferred.promise);

      const loginPayload = { userName: 'test-user', password: 'secret' };
      const requestA = FetchRetry('auth/login', loginPayload, 'POST');
      const requestB = FetchRetry('auth/login', loginPayload, 'POST');

      await Promise.resolve();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      const [resultA, resultB] = await Promise.all([requestA, requestB]);
      expect(resultA).toEqual({ ...mockSuccessResponse, statusCode: 200 });
      expect(resultB).toEqual({ ...mockSuccessResponse, statusCode: 200 });
    });

    it('should keep login requests separate for different payloads', async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        });

      const requestA = FetchRetry('auth/login', { userName: 'user-a', password: 'pw-a' }, 'POST');
      const requestB = FetchRetry('auth/login', { userName: 'user-b', password: 'pw-b' }, 'POST');

      await Promise.all([requestA, requestB]);

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('should de-duplicate parallel forgot-password requests with identical payload', async () => {
      const deferred = Promise.withResolvers<{
        ok: boolean;
        status: number;
        json: () => Promise<unknown>;
        headers: Headers;
      }>();

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => deferred.promise);

      const payload = { email: 'user@deutschebahn.com' };
      const requestA = FetchRetry('auth/forgot-password', payload, 'POST');
      const requestB = FetchRetry('auth/forgot-password', payload, 'POST');

      await Promise.resolve();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await Promise.all([requestA, requestB]);
    });

    it('should de-duplicate verify-email GET requests', async () => {
      const deferred = Promise.withResolvers<{
        ok: boolean;
        status: number;
        json: () => Promise<unknown>;
        headers: Headers;
      }>();

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => deferred.promise);

      const requestA = FetchRetry('auth/verify-email/token-123', undefined, 'GET');
      const requestB = FetchRetry('auth/verify-email/token-123', undefined, 'GET');

      await Promise.resolve();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      deferred.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await Promise.all([requestA, requestB]);
    });

    it('should proactively refresh an expiring token before protected requests', async () => {
      const futureExp = Math.floor((MOCK_DATE_NOW + 10_000) / 1000);
      const initialToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.sig`;
      const refreshedToken = `header.${btoa(JSON.stringify({ exp: Math.floor((MOCK_DATE_NOW + 300_000) / 1000) }))}.sig`;
      let currentAccessToken = initialToken;

      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) =>
        key === 'AccessToken' || key === 'RefreshToken' ? true : true,
      );
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return currentAccessToken;
        if (key === 'RefreshToken') return 'refresh-token';
        return null;
      });
      (tokenErneuern as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        currentAccessToken = refreshedToken;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
        headers: new Headers(),
      });

      await FetchRetry('auth/me', undefined, 'GET');

      expect(tokenErneuern).toHaveBeenCalledTimes(1);
      const requestInit = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect((requestInit.headers as Headers).get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    });

    it('should share one refresh flight across parallel protected requests', async () => {
      const expiredToken = `header.${btoa(JSON.stringify({ exp: Math.floor((MOCK_DATE_NOW - 10_000) / 1000) }))}.sig`;
      const refreshedToken = `header.${btoa(JSON.stringify({ exp: Math.floor((MOCK_DATE_NOW + 300_000) / 1000) }))}.sig`;
      let currentAccessToken = expiredToken;
      const refreshDeferred = Promise.withResolvers<void>();

      (Storage.check as ReturnType<typeof vi.fn>).mockImplementation((key: string) =>
        key === 'AccessToken' || key === 'RefreshToken' ? true : true,
      );
      (Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'AccessToken') return currentAccessToken;
        if (key === 'RefreshToken') return 'refresh-token';
        return null;
      });
      (tokenErneuern as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        await refreshDeferred.promise;
        currentAccessToken = refreshedToken;
      });

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
          headers: new Headers(),
        });

      const requestA = FetchRetry('auth/me', undefined, 'GET');
      const requestB = FetchRetry('auth/me', undefined, 'GET');

      await Promise.resolve();
      expect(tokenErneuern).toHaveBeenCalledTimes(1);

      refreshDeferred.resolve();
      await Promise.all([requestA, requestB]);

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      const firstHeaders = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .headers as Headers;
      const secondHeaders = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1]
        .headers as Headers;
      expect(firstHeaders.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
      expect(secondHeaders.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
    });
  });
});
