import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { API_URL, getServerUrl } from '@/shared/api/FetchRetry';

globalThis.fetch = vi.fn() as unknown as typeof fetch;

vi.mock('@/shared/lib/storage/Storage', () => ({
  default: { get: vi.fn(), set: vi.fn(), check: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}));
vi.mock('@/shared/ui/snackbar/CustomSnackbar', () => ({
  createSnackBar: vi.fn(() => ({ Close: vi.fn() })),
}));
vi.mock('@/shared/api/token/tokenErneuern', () => ({ default: vi.fn() }));
vi.mock('@/shared/api/abortController', () => ({
  abortController: { signal: new AbortController().signal, reset: vi.fn() },
}));

const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
const primaryUrl = API_URL[0].url;
const fallbackUrl = API_URL[1].url;

let now = 1_678_886_400_000;

/** Wartet, bis die im Hintergrund gestartete Hauptserver-Prüfung durch ist. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/** Treibt die Fake-Timer in kleinen Schritten voran, bis das Promise erledigt ist. */
async function settleWithTimers<T>(promise: Promise<T>, stepMs = 250, maxMs = 30_000): Promise<T> {
  let done = false;
  promise.then(
    () => (done = true),
    () => (done = true),
  );
  for (let elapsed = 0; !done && elapsed < maxMs; elapsed += stepMs) {
    await (vi as typeof vi & { advanceTimersByTimeAsync: (ms: number) => Promise<void> }).advanceTimersByTimeAsync(
      stepMs,
    );
  }
  return promise;
}

const okResponse = { ok: true, status: 200, json: async () => ({}), headers: new Headers() };

describe('getServerUrl: Rückwechsel vom Ausweichserver zum Hauptserver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    sessionStorage.clear();
    now += 10 * 60 * 1000; // Drosselung der Hintergrundprüfung aus vorherigen Tests zurücksetzen
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    sessionStorage.setItem('lastServerContact', now.toString());
    sessionStorage.setItem('currentServerUrl', fallbackUrl);
  });

  it('liefert sofort den Ausweichserver und wechselt nach erfolgreicher Hauptserver-Prüfung zurück', async () => {
    fetchMock.mockResolvedValue(okResponse);

    expect(await getServerUrl()).toBe(fallbackUrl);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(`${primaryUrl}/`, expect.anything());
    expect(sessionStorage.getItem('currentServerUrl')).toBe(primaryUrl);
    expect(await getServerUrl()).toBe(primaryUrl);
    expect(createSnackBar).not.toHaveBeenCalled();
  });

  it('bleibt auf dem Ausweichserver, solange der Hauptserver nicht antwortet', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    expect(await getServerUrl()).toBe(fallbackUrl);
    await flush();

    expect(sessionStorage.getItem('currentServerUrl')).toBe(fallbackUrl);
    expect(createSnackBar).not.toHaveBeenCalled();
  });

  it('prüft den Hauptserver höchstens einmal pro Minute', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    await getServerUrl();
    await flush();
    await getServerUrl();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 61_000;
    sessionStorage.setItem('lastServerContact', now.toString());
    await getServerUrl();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('prüft den Hauptserver nicht, wenn bereits er genutzt wird', async () => {
    sessionStorage.setItem('currentServerUrl', primaryUrl);

    expect(await getServerUrl()).toBe(primaryUrl);
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getServerUrl: Hauptserver wird vor dem Ausweichen zweimal geprüft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    sessionStorage.clear();
    now += 10 * 60 * 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  it('bleibt auf dem Hauptserver, wenn nur der erste Versuch scheitert (kurzer Aussetzer)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(okResponse);

    vi.useFakeTimers();
    let url: string;
    try {
      url = await settleWithTimers(getServerUrl());
    } finally {
      vi.useRealTimers();
    }

    expect(url).toBe(primaryUrl);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalledWith(`${fallbackUrl}/`, expect.anything());
  });
});
