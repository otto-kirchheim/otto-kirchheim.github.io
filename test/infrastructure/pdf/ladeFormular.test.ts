import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

type FetchAufruf = { pfad: string; daten: unknown; methode: string };

const gueltigeVersion = {
  version: 'v1',
  gueltigVon: '2026-01-01',
  gueltigBis: null,
  layout: { template: '/api/v2/vorlagen/abc123', seiten: [{ quelle: 0, bereiche: [], felder: {} }] },
  tabellen: {},
};

/** Lädt `ladeFormular` frisch mit gemocktem `FetchRetry`/`getServerUrl`/`Storage`/`build`/`fetch`. */
async function ladeModul(options: {
  fetchRetryAntwort?: { success: boolean; statusCode: number; message?: string; data?: unknown };
  vorlageOk?: boolean;
  vorlageStatus?: number;
} = {}) {
  const { fetchRetryAntwort = { success: true, statusCode: 200, data: gueltigeVersion }, vorlageOk = true, vorlageStatus = 200 } = options;

  const aufrufe: FetchAufruf[] = [];
  mock.module('@/infrastructure/api/FetchRetry', () => ({
    FetchRetry: (pfad: string, daten: unknown, methode: string) => {
      aufrufe.push({ pfad, daten, methode });
      return Promise.resolve(fetchRetryAntwort);
    },
    getServerUrl: () => Promise.resolve('https://example.test/api/v2'),
  }));
  mock.module('@/infrastructure/storage/Storage', () => ({
    default: { get: () => 'token123' },
  }));

  const buildMock = vi.fn().mockResolvedValue(new Uint8Array([9, 9, 9]));
  mock.module('@/infrastructure/pdf/build', () => ({ build: buildMock }));

  const rawFetchAufrufe: { url: string; headers: Record<string, string> }[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    rawFetchAufrufe.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
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
  return { modul, aufrufe, rawFetchAufrufe, buildMock };
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
  });

  describe('ladeUndErzeugePdf', () => {
    it('löst die Version server-seitig auf, lädt die Vorlage nach und ruft build() mit blob-Template auf', async () => {
      const { modul, aufrufe, buildMock } = await ladeModul();
      const daten = { Jahr: 2026, Monat: 4 };

      const bytes = await modul.ladeUndErzeugePdf('ea', '2026-04-01', daten, 'sig-png');

      expect(aufrufe[0]).toMatchObject({ pfad: 'formulare/ea?stichtag=2026-04-01', methode: 'GET' });
      expect(buildMock).toHaveBeenCalledWith(
        expect.objectContaining({ formular: 'ea', version: 'v1', layout: expect.objectContaining({ template: 'blob:mock-url' }) }),
        daten,
        'sig-png',
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
      const { modul } = await ladeModul({ fetchRetryAntwort: { success: true, statusCode: 200, data: { version: 'v1' } } });

      await expect(modul.ladeUndErzeugePdf('ea', '2026-04-01', {})).rejects.toThrow();
    });
  });
});
