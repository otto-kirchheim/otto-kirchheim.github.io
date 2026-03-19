import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDatenBZ, IDatenEWT } from '../../src/ts/interfaces';

// --- Hoisted mocks ---
const { mockFetchRetry, mockGetServerUrl } = vi.hoisted(() => ({
  mockFetchRetry: vi.fn(),
  mockGetServerUrl: vi.fn(),
}));

vi.mock('../../src/ts/utilities/FetchRetry', () => ({
  FetchRetry: mockFetchRetry,
  getServerUrl: mockGetServerUrl,
}));

vi.mock('../../src/ts/utilities/abortController', () => ({
  abortController: { signal: new AbortController().signal, reset: vi.fn() },
}));

import {
  authApi,
  bereitschaftszeitraumApi,
  downloadPdf,
  ewtApi,
  loadAllYearData,
  nebengeldApi,
  profileApi,
  vorgabenApi,
} from '../../src/ts/utilities/apiService';

// ─── Hilfsfunktionen ─────────────────────────────────────

function mockApiSuccess<T>(data: T) {
  mockFetchRetry.mockResolvedValue({ success: true, data, statusCode: 200 });
}

function mockApiError(message: string, status = 400) {
  mockFetchRetry.mockResolvedValue({ success: false, message, statusCode: status });
}

// ─── Tests ───────────────────────────────────────────────

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');
  });

  // ─── Auth-Endpunkte ──────────────────────────────

  describe('authApi', () => {
    it('login sendet korrekte Daten', async () => {
      mockApiSuccess({ user: { userName: 'user', role: 'member' } });
      await authApi.login('user', 'pass');
      expect(mockFetchRetry).toHaveBeenCalledWith('auth/login', { userName: 'user', password: 'pass' }, 'POST');
    });

    it('register sendet korrekte Daten', async () => {
      mockApiSuccess({ user: { userName: 'user', role: 'member' } });
      await authApi.register('user', 'email@test.de', 'pass', 'code123');
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'auth/register',
        { userName: 'user', email: 'email@test.de', password: 'pass', accessCode: 'code123' },
        'POST',
      );
    });

    it('refreshToken sendet direkten fetch mit credentials', async () => {
      mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { userName: 'Max', role: 'member' } }),
      });

      const result = await authApi.refreshToken();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/auth/refresh-token',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
      expect(result).toEqual({ userName: 'Max', role: 'member' });
    });

    it('changePassword sendet alte und neue Passwörter', async () => {
      mockApiSuccess({});
      const result = await authApi.changePassword('old', 'new');
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'auth/change-password',
        { currentPassword: 'old', newPassword: 'new' },
        'POST',
      );
      expect(result).toBe(true);
    });

    it('me ruft auth/me auf', async () => {
      mockApiSuccess({ id: '1', userName: 'test', role: 'user' });
      const result = await authApi.me();
      expect(mockFetchRetry).toHaveBeenCalledWith('auth/me', undefined, 'GET');
      expect(result.userName).toBe('test');
    });

    it('logout ignoriert Fehler', async () => {
      mockFetchRetry.mockRejectedValue(new Error('network fail'));
      await expect(authApi.logout()).resolves.toBeUndefined();
    });

    it('wirft bei API-Fehler', async () => {
      mockApiError('Ungültige Anmeldedaten', 401);
      await expect(authApi.login('bad', 'creds')).rejects.toThrow('Ungültige Anmeldedaten');
    });

    it('wirft bei FetchRetry Error-Instanz', async () => {
      mockFetchRetry.mockResolvedValue(new Error('Connection timeout'));
      await expect(authApi.login('u', 'p')).rejects.toThrow('Connection timeout');
    });
  });

  // ─── Profile-Endpunkte ───────────────────────────

  describe('profileApi', () => {
    it('getMyProfile konvertiert Backend-Format', async () => {
      mockApiSuccess({
        User: 'u1',
        Pers: { Vorname: 'Max', Nachname: 'Test', PNummer: '123' },
        Arbeitszeit: { bT: '07:00' },
        Fahrzeit: [],
        VorgabenB: [],
        updatedAt: '2024-06-15T12:00:00.000Z',
      });
      const result = await profileApi.getMyProfile();
      expect(result.data.pers.Vorname).toBe('Max');
      expect(result.updatedAt).toBe('2024-06-15T12:00:00.000Z');
      expect(mockFetchRetry).toHaveBeenCalledWith('user-profiles/me', undefined, 'GET');
    });

    it('updateMyProfile konvertiert hin und zurück', async () => {
      const profileData = {
        pers: { Vorname: 'Anna', Nachname: 'Test', PNummer: '456' },
        aZ: { bT: '08:00' },
        fZ: [],
        vorgabenB: {},
      };
      mockApiSuccess({
        User: 'u1',
        Pers: profileData.pers,
        Arbeitszeit: profileData.aZ,
        Fahrzeit: [],
        VorgabenB: [],
        updatedAt: '2024-06-15T13:00:00.000Z',
      });
      const result = await profileApi.updateMyProfile(profileData as never);
      expect(result.data.pers.Vorname).toBe('Anna');
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'user-profiles/me',
        expect.objectContaining({ Pers: profileData.pers }),
        'PUT',
      );
    });
  });

  // ─── Vorgaben-Endpunkte ──────────────────────────

  describe('vorgabenApi', () => {
    it('getByYear ruft vorgaben/:year auf', async () => {
      mockApiSuccess({ _id: 2024, Vorgaben: [{ key: 1, value: { Tarifkraft: 2.58 } }] });
      const result = await vorgabenApi.getByYear(2024);
      expect(mockFetchRetry).toHaveBeenCalledWith('vorgaben/2024', undefined, 'GET');
      expect(result[1]).toEqual({ Tarifkraft: 2.58 });
    });
  });

  // ─── Ressourcen-Loading ──────────────────────────

  describe('loadYear', () => {
    it('bereitschaftszeitraumApi.loadYear gruppiert nach Monat', async () => {
      mockApiSuccess([
        {
          _id: 'bz1',
          Monat: 4,
          Jahr: 2024,
          Beginn: '2024-04-12',
          Ende: '2024-04-19',
          updatedAt: '2024-06-15T12:00:00.000Z',
        },
        {
          _id: 'bz2',
          Monat: 4,
          Jahr: 2024,
          Beginn: '2024-04-20',
          Ende: '2024-04-26',
          updatedAt: '2024-06-15T13:00:00.000Z',
        },
      ]);
      const result = await bereitschaftszeitraumApi.loadYear(2024);
      expect(result.data[4]).toHaveLength(2);
      expect(result.data[1]).toEqual([]);
      expect(result.updatedAt).toBe('2024-06-15T13:00:00.000Z');
      expect(mockFetchRetry).toHaveBeenCalledWith('bereitschaftszeitraum/2024', undefined, 'GET');
    });

    it('ewtApi.loadYear gruppiert und konvertiert', async () => {
      mockApiSuccess([
        { _id: 'ewt1', Monat: 3, Jahr: 2024, Tag: '2024-03-10', Schicht: 'Tag', updatedAt: '2024-06-15T12:00:00.000Z' },
      ]);
      const result = await ewtApi.loadYear(2024);
      expect(result.data[3]).toHaveLength(1);
      expect(result.data[3][0].schichtE).toBe('Tag');
      expect(result.updatedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('nebengeldApi.loadYear konvertiert', async () => {
      mockApiSuccess([
        {
          _id: 'n1',
          Monat: 6,
          Jahr: 2024,
          Tag: '2024-06-15',
          Beginn: '18:00',
          Ende: '06:00',
          Zulagen: [{ Typ: '040', Wert: 2 }],
          updatedAt: '2024-06-15T14:00:00.000Z',
        },
      ]);
      const result = await nebengeldApi.loadYear(2024);
      expect(result.data[6]).toHaveLength(1);
      expect(result.data[6][0].anzahl040N).toBe(2);
      expect(result.updatedAt).toBe('2024-06-15T14:00:00.000Z');
    });
  });

  // ─── Bulk / SmartSync ────────────────────────────

  describe('bulk / smartSync', () => {
    it('einzelnes Create nutzt Einzel-Endpoint (POST)', async () => {
      const newBz: IDatenBZ = { beginB: '2024-04-12', endeB: '2024-04-19', pauseB: 0 };
      mockApiSuccess({ _id: 'new1', Monat: 4, Jahr: 2024, Beginn: '2024-04-12', Ende: '2024-04-19' });

      const result = await bereitschaftszeitraumApi.bulk({ create: [newBz], update: [], delete: [] }, 4, 2024);
      // Einzeln POST statt bulk
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'bereitschaftszeitraum',
        expect.objectContaining({ Monat: 4, Jahr: 2024 }),
        'POST',
      );
      expect(result.created).toHaveLength(1);
    });

    it('einzelnes Update nutzt Einzel-Endpoint (PUT)', async () => {
      const updated: IDatenBZ = { _id: 'bz1', beginB: '2024-04-14', endeB: '2024-04-20', pauseB: 15 };
      mockApiSuccess({ _id: 'bz1', Monat: 4, Jahr: 2024, Beginn: '2024-04-14', Ende: '2024-04-20' });

      const result = await bereitschaftszeitraumApi.bulk({ create: [], update: [updated], delete: [] }, 4, 2024);
      expect(mockFetchRetry).toHaveBeenCalledWith('bereitschaftszeitraum/bz1', expect.anything(), 'PUT');
      expect(result.updated).toHaveLength(1);
    });

    it('einzelnes Delete nutzt Einzel-Endpoint (DELETE)', async () => {
      mockApiSuccess(undefined);
      const result = await bereitschaftszeitraumApi.bulk({ create: [], update: [], delete: ['bz-del1'] }, 4, 2024);
      expect(mockFetchRetry).toHaveBeenCalledWith('bereitschaftszeitraum/bz-del1', undefined, 'DELETE');
      expect(result.deleted).toEqual(['bz-del1']);
    });

    it('mehrere Operationen nutzen Bulk-Endpoint', async () => {
      const newBz: IDatenBZ = { beginB: '2024-04-12', endeB: '2024-04-19', pauseB: 0 };
      const updatedBz: IDatenBZ = { _id: 'bz1', beginB: '2024-04-14', endeB: '2024-04-20', pauseB: 15 };
      mockApiSuccess({ created: [], updated: [], deleted: [], errors: [] });

      await bereitschaftszeitraumApi.bulk({ create: [newBz], update: [updatedBz], delete: [] }, 4, 2024);
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'bereitschaftszeitraum/bulk',
        expect.objectContaining({ create: expect.any(Array), update: expect.any(Array) }),
        'POST',
      );
    });

    it('ewtApi.bulk mit einzelnem Create', async () => {
      const newEwt: IDatenEWT = {
        tagE: '2024-04-10',
        eOrtE: 'Frankfurt',
        schichtE: 'Tag',
        abWE: '',
        ab1E: '',
        anEE: '',
        beginE: '',
        endeE: '',
        abEE: '',
        an1E: '',
        anWE: '',
        berechnen: true,
      };
      mockApiSuccess({ _id: 'ewt-new', Monat: 4, Jahr: 2024, Tag: '2024-04-10', Schicht: 'Tag' });
      const result = await ewtApi.bulk({ create: [newEwt], update: [], delete: [] }, 4, 2024);
      expect(result.created).toHaveLength(1);
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'einsatzwechseltaetigkeit',
        expect.objectContaining({ Schicht: 'Tag' }),
        'POST',
      );
    });

    it('nebengeldApi.bulk mit Löschung', async () => {
      mockApiSuccess(undefined);
      const result = await nebengeldApi.bulk({ create: [], update: [], delete: ['n-del1'] }, 3, 2024);
      expect(result.deleted).toEqual(['n-del1']);
    });

    it('leere Bulk-Operation sendet trotzdem', async () => {
      mockApiSuccess({ created: [], updated: [], deleted: [], errors: [] });
      const result = await bereitschaftszeitraumApi.bulk({ create: [], update: [], delete: [] }, 4, 2024);
      expect(result.created).toEqual([]);
    });
  });

  // ─── loadAllYearData ─────────────────────────────

  describe('loadAllYearData', () => {
    it('lädt alle Daten parallel', async () => {
      // Sechs aufeinanderfolgende API-Calls
      mockFetchRetry
        .mockResolvedValueOnce({
          success: true,
          data: {
            User: 'u1',
            Pers: { Vorname: 'X', Nachname: 'Y', PNummer: '1' },
            Arbeitszeit: {},
            Fahrzeit: [],
            VorgabenB: [],
          },
          statusCode: 200,
        })
        .mockResolvedValueOnce({ success: true, data: { _id: 2024, Vorgaben: [] }, statusCode: 200 })
        .mockResolvedValueOnce({ success: true, data: [], statusCode: 200 })
        .mockResolvedValueOnce({ success: true, data: [], statusCode: 200 })
        .mockResolvedValueOnce({ success: true, data: [], statusCode: 200 })
        .mockResolvedValueOnce({ success: true, data: [], statusCode: 200 });

      const result = await loadAllYearData(2024);
      expect(result).toHaveProperty('vorgabenU');
      expect(result).toHaveProperty('datenGeld');
      expect(result).toHaveProperty('BZ');
      expect(result).toHaveProperty('BE');
      expect(result).toHaveProperty('EWT');
      expect(result).toHaveProperty('N');
      expect(result).toHaveProperty('timestamps');
      expect(result.timestamps).toEqual({
        VorgabenU: null,
        dataBZ: null,
        dataBE: null,
        dataE: null,
        dataN: null,
      });
      expect(mockFetchRetry).toHaveBeenCalledTimes(6);
    });
  });

  // ─── downloadPdf ─────────────────────────────────

  describe('downloadPdf', () => {
    it('wirft wenn offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      await expect(downloadPdf('B', {})).rejects.toThrow('Keine Internetverbindung');
    });

    it('sendet korrekten Request', async () => {
      mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');

      const mockBlob = new Blob(['pdf']);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: new Headers({ 'content-disposition': 'filename="test.pdf"' }),
      });

      const result = await downloadPdf('B', { data: 'test' });
      expect(result.blob).toBe(mockBlob);
      expect(result.filename).toBe('test.pdf');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/bereitschaftszeitraum/download',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('nutzt korrekten Endpoint pro Modus', async () => {
      mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');

      const mockResponse = {
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf'])),
        headers: new Headers(),
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await downloadPdf('E', {});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('einsatzwechseltaetigkeit/download'),
        expect.anything(),
      );

      await downloadPdf('N', {});
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('nebengeld/download'), expect.anything());
    });

    it('wirft bei nicht-ok Response', async () => {
      mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(downloadPdf('B', {})).rejects.toThrow('Server error');
    });

    it('nutzt Fallback-Filename wenn keine Content-Disposition', async () => {
      mockGetServerUrl.mockResolvedValue('http://localhost:3000/api/v2');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf'])),
        headers: new Headers(), // Keine content-disposition
      });

      const result = await downloadPdf('B', {});
      expect(result.filename).toBe('download.pdf');
    });
  });
});
