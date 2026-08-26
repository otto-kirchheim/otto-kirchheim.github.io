import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

class TestApiFehler extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiFehler';
  }
}

const { fetchRetryMock, getServerUrlMock, authHeaderMock, holeVorlageAlsDateiMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  fetchRetryMock: vi.fn(),
  getServerUrlMock: vi.fn(),
  authHeaderMock: vi.fn(),
  holeVorlageAlsDateiMock: vi.fn(),
}));

vi.mock('@/infrastructure/api/FetchRetry', () => ({
  FetchRetry: fetchRetryMock,
  getServerUrl: getServerUrlMock,
}));

vi.mock('@/infrastructure/pdf/ladeFormular', () => ({
  ApiFehler: TestApiFehler,
  authHeader: authHeaderMock,
  holeVorlageAlsDatei: holeVorlageAlsDateiMock,
}));

import {
  aendereVersion,
  holeVersionen,
  ladeVorlagenHoch,
  legeVersionAn,
  loescheVersion,
} from '@/features/Admin/components/formularVersionenApi';

describe('formularVersionenApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authHeaderMock.mockReturnValue({ Authorization: 'Bearer test' });
  });

  describe('holeVersionen/legeVersionAn/aendereVersion/loescheVersion (ueber ruf())', () => {
    it('holeVersionen ruft GET auf den Versionen-Pfad und liefert data zurück', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: [{ id: 'v1' }] });

      const result = await holeVersionen('ez');

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen', undefined, 'GET');
      expect(result).toEqual([{ id: 'v1' }] as never);
    });

    it('legeVersionAn ruft POST mit den Daten auf', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: { id: 'v2' } });
      const daten = {
        version: '1',
        gueltigVon: '2025-01-01',
        gueltigBis: null,
        vorlageId: 'x',
        konfig: {},
        tabellen: {},
      };

      await legeVersionAn('ez', daten as never);

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen', daten, 'POST');
    });

    it('aendereVersion haengt erzwingen an die Daten an', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: {} });
      const daten = {
        version: '1',
        gueltigVon: '2025-01-01',
        gueltigBis: null,
        vorlageId: 'x',
        konfig: {},
        tabellen: {},
      };

      await aendereVersion('ez', 'v1', daten as never, true);

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen/v1', { ...daten, erzwingen: true }, 'PUT');
    });

    it('aendereVersion setzt erzwingen standardmäßig auf false', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: {} });
      const daten = {
        version: '1',
        gueltigVon: '2025-01-01',
        gueltigBis: null,
        vorlageId: 'x',
        konfig: {},
        tabellen: {},
      };

      await aendereVersion('ez', 'v1', daten as never);

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen/v1', { ...daten, erzwingen: false }, 'PUT');
    });

    it('loescheVersion haengt den erzwingen-Query-Parameter an', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: undefined });

      await loescheVersion('ez', 'v1', true);

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen/v1?erzwingen=true', undefined, 'DELETE');
    });

    it('loescheVersion laesst den Query-Parameter ohne erzwingen weg', async () => {
      fetchRetryMock.mockResolvedValue({ success: true, data: undefined });

      await loescheVersion('ez', 'v1');

      expect(fetchRetryMock).toHaveBeenCalledWith('formulare/ez/versionen/v1', undefined, 'DELETE');
    });

    it('wirft die Response als Error, wenn FetchRetry einen Error liefert', async () => {
      const networkError = new Error('Netzwerkfehler');
      fetchRetryMock.mockResolvedValue(networkError);

      await expect(holeVersionen('ez')).rejects.toThrow('Netzwerkfehler');
    });

    it('wirft ApiFehler mit Backend-Message bei success=false', async () => {
      fetchRetryMock.mockResolvedValue({ success: false, message: 'Konflikt', statusCode: 409 });

      await expect(holeVersionen('ez')).rejects.toMatchObject({ message: 'Konflikt', statusCode: 409 });
    });

    it('wirft ApiFehler mit generischer Meldung, wenn keine Backend-Message vorhanden ist', async () => {
      fetchRetryMock.mockResolvedValue({ success: false, statusCode: 500 });

      await expect(holeVersionen('ez')).rejects.toMatchObject({
        message: 'Anfrage fehlgeschlagen (500)',
        statusCode: 500,
      });
    });
  });

  describe('ladeVorlagenHoch', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('lädt die Datei per FormData hoch und liefert die neue Vorlagen-ID', async () => {
      getServerUrlMock.mockResolvedValue('http://localhost:3000/api/v2');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ success: true, data: { id: 'vorlage-1' } }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const id = await ladeVorlagenHoch('ez', new File(['%PDF'], 'test.pdf'));

      expect(id).toBe('vorlage-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/vorlagen',
        expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer test' } }),
      );
    });

    it('wirft ApiFehler mit Backend-Message, wenn der Upload fehlschlägt', async () => {
      getServerUrlMock.mockResolvedValue('http://localhost:3000/api/v2');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ success: false, message: 'Ungültige Datei' }),
      }) as unknown as typeof fetch;

      await expect(ladeVorlagenHoch('ez', new File(['x'], 'x.pdf'))).rejects.toMatchObject({
        message: 'Ungültige Datei',
        statusCode: 422,
      });
    });

    it('wirft eine generische Fehlermeldung ohne Backend-Message', async () => {
      getServerUrlMock.mockResolvedValue('http://localhost:3000/api/v2');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false }),
      }) as unknown as typeof fetch;

      await expect(ladeVorlagenHoch('ez', new File(['x'], 'x.pdf'))).rejects.toMatchObject({
        message: 'Upload fehlgeschlagen (500)',
        statusCode: 500,
      });
    });
  });

  it('re-exportiert ApiFehler/holeVorlageAlsDatei fuer bestehende Importe', async () => {
    const mod = await import('@/features/Admin/components/formularVersionenApi');
    expect(mod.ApiFehler).toBe(TestApiFehler);
    expect(mod.holeVorlageAlsDatei).toBe(holeVorlageAlsDateiMock);
  });
});
