import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

type FetchAufruf = { pfad: string; daten: unknown; methode: string };

const gueltigeVersion = {
  version: 'v1',
  gueltigVon: '2026-01-01',
  gueltigBis: null,
  layout: { template: '/api/v2/vorlagen/abc123', seiten: [{ quelle: 0, bereiche: [], felder: {} }] },
  tabellen: {},
};

/** Erzeugt einen `Storage`-Mock mit echtem In-Memory-`get`/`set` (statt eines festen Rückgabewerts) --
 * die `formularCache`-Logik läuft dadurch UNGEMOCKT gegen diesen Speicher, genau wie im echten
 * `Storage`-Singleton (nur ohne den `RESOURCE_KEYS`-Wrapper, den `formularCache` ohnehin nicht nutzt). */
function macheStorageMock(initial: Record<string, unknown> = {}) {
  const daten: Record<string, unknown> = { AccessToken: 'token123', ...initial };
  return {
    get: (key: string, options?: { default?: unknown }) => (key in daten ? daten[key] : (options?.default ?? null)),
    set: (key: string, value: unknown) => {
      daten[key] = value;
    },
  };
}

async function alsBase64(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  let binaer = '';
  for (const b of bytes) binaer += String.fromCharCode(b);
  return btoa(binaer);
}

/** Lädt `ladeFormular` frisch mit gemocktem `FetchRetry`/`getServerUrl`/`Storage`/`build`/`fetch`. */
async function ladeModul(
  options: {
    fetchRetryAntwort?: { success: boolean; statusCode: number; message?: string; data?: unknown };
    fetchRetryWirft?: Error;
    vorlageOk?: boolean;
    vorlageStatus?: number;
    vorlageWirft?: Error;
    storageInitial?: Record<string, unknown>;
  } = {},
) {
  const {
    fetchRetryAntwort = { success: true, statusCode: 200, data: gueltigeVersion },
    fetchRetryWirft,
    vorlageOk = true,
    vorlageStatus = 200,
    vorlageWirft,
    storageInitial = {},
  } = options;

  const aufrufe: FetchAufruf[] = [];
  mock.module('@/infrastructure/api/FetchRetry', () => ({
    FetchRetry: (pfad: string, daten: unknown, methode: string) => {
      aufrufe.push({ pfad, daten, methode });
      if (fetchRetryWirft) return Promise.reject(fetchRetryWirft);
      return Promise.resolve(fetchRetryAntwort);
    },
    getServerUrl: () => Promise.resolve('https://example.test/api/v2'),
  }));
  const storage = macheStorageMock(storageInitial);
  mock.module('@/infrastructure/storage/Storage', () => ({ default: storage }));

  const buildMock = vi.fn().mockResolvedValue(new Uint8Array([9, 9, 9]));
  mock.module('@/infrastructure/pdf/build', () => ({ build: buildMock }));

  const rawFetchAufrufe: { url: string; headers: Record<string, string> }[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    rawFetchAufrufe.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
    if (vorlageWirft) return Promise.reject(vorlageWirft);
    return Promise.resolve({
      ok: vorlageOk,
      status: vorlageStatus,
      blob: () => Promise.resolve(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
    } as Response);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();

  const modul = await import('@/infrastructure/pdf/ladeFormular');
  return { modul, aufrufe, rawFetchAufrufe, buildMock, storage };
}

describe('ladeFormular', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('holeVorlageAlsDatei', () => {
    it('lädt die Vorlage authentifiziert und liefert sie als File', async () => {
      const { modul, rawFetchAufrufe } = await ladeModul();

      const datei = await modul.holeVorlageAlsDatei('abc123');

      expect(rawFetchAufrufe[0]!.url).toBe('https://example.test/api/v2/vorlagen/abc123');
      expect(rawFetchAufrufe[0]!.headers.Authorization).toBe('Bearer token123');
      expect(datei.name).toBe('vorlage-abc123.pdf');
      expect(datei.type).toBe('application/pdf');
    });

    it('wirft einen ApiFehler mit Statuscode bei fehlgeschlagener Antwort', async () => {
      const { modul } = await ladeModul({ vorlageOk: false, vorlageStatus: 404 });

      const fehler = await modul.holeVorlageAlsDatei('fehlt').catch((e: unknown) => e);

      expect(fehler).toBeInstanceOf(modul.ApiFehler);
      expect((fehler as InstanceType<typeof modul.ApiFehler>).statusCode).toBe(404);
    });

    it('cached die Vorlage nach erfolgreichem Laden', async () => {
      const { modul, storage } = await ladeModul();

      await modul.holeVorlageAlsDatei('abc123');

      const cache = storage.get('vorlagenPdfCache', { default: {} }) as Record<string, { base64: string }>;
      expect(cache['abc123']).toBeDefined();
    });

    it('nutzt die gecachte Vorlage bei einem Netzwerkfehler', async () => {
      const base64 = await alsBase64('gecachter-inhalt');
      const { modul } = await ladeModul({
        vorlageWirft: new Error('Failed to fetch'),
        storageInitial: { vorlagenPdfCache: { abc123: { base64, timestamp: Date.now() } } },
      });

      const datei = await modul.holeVorlageAlsDatei('abc123');

      expect(await datei.text()).toBe('gecachter-inhalt');
    });

    it('wirft weiterhin bei Netzwerkfehler ohne vorhandenen Cache-Eintrag', async () => {
      const { modul } = await ladeModul({ vorlageWirft: new Error('Failed to fetch') });

      await expect(modul.holeVorlageAlsDatei('abc123')).rejects.toThrow('Failed to fetch');
    });

    it('ignoriert einen vorhandenen Cache-Eintrag bei einer echten 404-Antwort', async () => {
      const base64 = await alsBase64('veraltet');
      const { modul } = await ladeModul({
        vorlageOk: false,
        vorlageStatus: 404,
        storageInitial: { vorlagenPdfCache: { abc123: { base64, timestamp: Date.now() } } },
      });

      const fehler = await modul.holeVorlageAlsDatei('abc123').catch((e: unknown) => e);

      expect(fehler).toBeInstanceOf(modul.ApiFehler);
    });
  });

  describe('ladeUndErzeugePdf', () => {
    it('löst die Version server-seitig auf, lädt die Vorlage nach und ruft build() mit blob-Template auf', async () => {
      const { modul, aufrufe, buildMock } = await ladeModul();
      const daten = { Jahr: 2026, Monat: 4 };

      const bytes = await modul.ladeUndErzeugePdf('ea', '2026-04-01', daten, 'sig-png');

      expect(aufrufe[0]).toMatchObject({ pfad: 'formulare/ea?stichtag=2026-04-01', methode: 'GET' });
      expect(buildMock).toHaveBeenCalledWith(
        expect.objectContaining({
          formular: 'ea',
          version: 'v1',
          layout: expect.objectContaining({ template: 'blob:mock-url' }),
        }),
        daten,
        'sig-png',
        undefined,
      );
      expect(bytes).toEqual(new Uint8Array([9, 9, 9]));
    });

    it('wirft einen ApiFehler, wenn keine gültige Version gefunden wird', async () => {
      const { modul } = await ladeModul({
        fetchRetryAntwort: { success: false, statusCode: 404, message: 'Version für ea am 2026-04-01' },
      });

      const fehler = await modul.ladeUndErzeugePdf('ea', '2026-04-01', {}).catch((e: unknown) => e);

      expect(fehler).toBeInstanceOf(modul.ApiFehler);
      expect((fehler as InstanceType<typeof modul.ApiFehler>).statusCode).toBe(404);
    });

    it('wirft (via Zod), wenn der Server eine strukturell kaputte Version liefert', async () => {
      const { modul } = await ladeModul({
        fetchRetryAntwort: { success: true, statusCode: 200, data: { version: 'v1' } },
      });

      await expect(modul.ladeUndErzeugePdf('ea', '2026-04-01', {})).rejects.toThrow();
    });

    it('cached die Version nach erfolgreicher Auflösung', async () => {
      const { modul, storage } = await ladeModul();

      await modul.ladeUndErzeugePdf('ea', '2026-04-01', {});

      const cache = storage.get('formularVersionCache', { default: {} }) as Record<string, { version: unknown }>;
      expect(cache['ea:2026-04-01']).toBeDefined();
    });

    it('nutzt die gecachte Version bei einem Netzwerkfehler', async () => {
      const { modul, buildMock } = await ladeModul({
        fetchRetryWirft: new Error('Keine Internetverbindung'),
        storageInitial: {
          formularVersionCache: { 'ea:2026-04-01': { version: gueltigeVersion, timestamp: Date.now() } },
        },
      });

      await modul.ladeUndErzeugePdf('ea', '2026-04-01', {});

      expect(buildMock).toHaveBeenCalled();
    });

    it('wirft weiterhin bei Netzwerkfehler ohne vorhandenen Cache-Eintrag', async () => {
      const { modul } = await ladeModul({ fetchRetryWirft: new Error('Keine Internetverbindung') });

      await expect(modul.ladeUndErzeugePdf('ea', '2026-04-01', {})).rejects.toThrow('Keine Internetverbindung');
    });

    it('ignoriert einen vorhandenen Cache-Eintrag, wenn der Server bewusst "keine gültige Version" antwortet', async () => {
      const { modul } = await ladeModul({
        fetchRetryAntwort: { success: false, statusCode: 404, message: 'Version für ea am 2026-04-01' },
        storageInitial: {
          formularVersionCache: { 'ea:2026-04-01': { version: gueltigeVersion, timestamp: Date.now() } },
        },
      });

      const fehler = await modul.ladeUndErzeugePdf('ea', '2026-04-01', {}).catch((e: unknown) => e);

      expect(fehler).toBeInstanceOf(modul.ApiFehler);
    });
  });
});
