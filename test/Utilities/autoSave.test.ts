import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { createCustomTable } from '../../src/ts/infrastructure/table/CustomTable';

const viCompat = vi as typeof vi & {
  hoisted: <T>(factory: () => T) => T;
  advanceTimersByTimeAsync: (ms: number) => Promise<void>;
};

// --- Hoisted mocks ---
const {
  mockCreateSnackBar,
  mockUpdateMyProfile,
  mockBzBulk,
  mockBeBulk,
  mockEwtBulk,
  mockNBulk,
  mockAktualisiereBerechnung,
} = viCompat.hoisted(() => ({
  mockCreateSnackBar: vi.fn(),
  mockUpdateMyProfile: vi.fn(),
  mockBzBulk: vi.fn(),
  mockBeBulk: vi.fn(),
  mockEwtBulk: vi.fn(),
  mockNBulk: vi.fn(),
  mockAktualisiereBerechnung: vi.fn(),
}));

// --- Mocks ---
vi.mock('../../src/ts/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('../../src/ts/infrastructure/api/apiService', () => ({
  profileApi: { updateMyProfile: mockUpdateMyProfile },
  bereitschaftszeitraumApi: { bulk: mockBzBulk },
  bereitschaftseinsatzApi: { bulk: mockBeBulk },
  ewtApi: { bulk: mockEwtBulk },
  nebengeldApi: { bulk: mockNBulk },
}));

import Storage from '../../src/ts/infrastructure/storage/Storage';
import {
  cancelAllPending,
  createOnChangeHandler,
  flushAll,
  getAutoSaveDelay,
  getResourceStatus,
  initAutoSaveEventListener,
  isAutoSaveEnabled,
  markResourceSaved,
  onAutoSaveStatus,
  scheduleAutoSave,
  setAutoSaveDelay,
  setAutoSaveEnabled,
} from '../../src/ts/infrastructure/autoSave/autoSave';
import { clearAllHooks } from '../../src/ts/core/hooks';
import { onEvent, clearAllEventListeners } from '../../src/ts/core/events/appEvents';

// --- Hilfsfunktion: Mock-Table im DOM erstellen ---
function createMockTable(
  id: string,
  changes: { create: unknown[]; update: unknown[]; delete: string[] } = { create: [], update: [], delete: [] },
  rows: {
    _state: string;
    cells: Record<string, unknown>;
    _id?: string;
    _clientRequestId?: string;
    _errorState?: string;
    _errorMessage?: string | null;
    _originalCells?: Record<string, unknown>;
  }[] = [],
) {
  const mockCommitChanges = vi.fn();
  const mockCommitAutoSave = vi.fn();
  const mockGetChanges = vi.fn().mockReturnValue(changes);
  const table = document.createElement('table');
  table.id = id;

  (table as any).instance = {
    getRows: () => rows,
    drawRows: vi.fn(),
    rows: {
      getChanges: mockGetChanges,
      getFilteredRows: vi.fn().mockReturnValue(rows),
      commitChanges: mockCommitChanges,
      commitAutoSave: mockCommitAutoSave,
      array: rows,
    },
  };
  document.body.appendChild(table);
  return { mockGetChanges, mockCommitChanges, mockCommitAutoSave };
}

describe('autoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    clearAllHooks();
    clearAllEventListeners();
    initAutoSaveEventListener();
    onEvent('data:changed', mockAktualisiereBerechnung);
    document.body.innerHTML = '';

    // Reset state
    setAutoSaveEnabled(true);
    cancelAllPending();

    // online-Event dispatchen um internen onlineListenerRegistered-Flag zurückzusetzen
    window.dispatchEvent(new Event('online'));

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAllEventListeners();
  });

  // ─── Konfiguration ───────────────────────────────────

  describe('Konfiguration', () => {
    it('getAutoSaveDelay gibt Standardwert zurück', () => {
      expect(typeof getAutoSaveDelay()).toBe('number');
      expect(getAutoSaveDelay()).toBeGreaterThan(0);
    });

    it('setAutoSaveDelay ändert den Delay', () => {
      const original = getAutoSaveDelay();
      setAutoSaveDelay(5000);
      expect(getAutoSaveDelay()).toBe(5000);
      setAutoSaveDelay(original); // Zurücksetzen
    });

    it('isAutoSaveEnabled ist standardmäßig true', () => {
      expect(isAutoSaveEnabled()).toBe(true);
    });

    it('setAutoSaveEnabled(false) deaktiviert AutoSave', () => {
      setAutoSaveEnabled(false);
      expect(isAutoSaveEnabled()).toBe(false);
      setAutoSaveEnabled(true);
    });

    it('setAutoSaveEnabled(false) cancelt alle pending Timer', () => {
      scheduleAutoSave('BZ');
      expect(getResourceStatus('BZ').status).toBe('pending');
      setAutoSaveEnabled(false);
      expect(getResourceStatus('BZ').status).toBe('idle');
    });
  });

  // ─── Status-Listener ─────────────────────────────────

  describe('Status-Listener', () => {
    it('onAutoSaveStatus registriert Listener', () => {
      const listener = vi.fn();
      const unsub = onAutoSaveStatus(listener);
      markResourceSaved('BZ');
      expect(listener).toHaveBeenCalledWith('BZ', 'saved', undefined);
      unsub();
    });

    it('unsubscribe entfernt Listener', () => {
      const listener = vi.fn();
      const unsub = onAutoSaveStatus(listener);
      unsub();
      markResourceSaved('BZ');
      expect(listener).not.toHaveBeenCalled();
    });

    it('mehrere Listener werden alle benachrichtigt', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsub1 = onAutoSaveStatus(listener1);
      const unsub2 = onAutoSaveStatus(listener2);
      markResourceSaved('EWT');
      expect(listener1).toHaveBeenCalledWith('EWT', 'saved', undefined);
      expect(listener2).toHaveBeenCalledWith('EWT', 'saved', undefined);
      unsub1();
      unsub2();
    });
  });

  // ─── getResourceStatus ───────────────────────────────

  describe('getResourceStatus', () => {
    it('gibt Status für alle Ressourcen zurück', () => {
      for (const key of ['BZ', 'BE', 'EWT', 'N', 'settings'] as const) {
        const status = getResourceStatus(key);
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('timer');
        expect(status).toHaveProperty('lastSaved');
        expect(status).toHaveProperty('lastError');
      }
    });

    it('markResourceSaved setzt Status auf saved', () => {
      markResourceSaved('N');
      const status = getResourceStatus('N');
      expect(status.status).toBe('saved');
      expect(status.lastSaved).toBeInstanceOf(Date);
    });
  });

  // ─── scheduleAutoSave ────────────────────────────────

  describe('scheduleAutoSave', () => {
    it('setzt Status auf pending', () => {
      scheduleAutoSave('BZ');
      expect(getResourceStatus('BZ').status).toBe('pending');
    });

    it('macht nichts wenn AutoSave deaktiviert', () => {
      setAutoSaveEnabled(false);
      const listener = vi.fn();
      const unsub = onAutoSaveStatus(listener);
      scheduleAutoSave('BZ');
      expect(listener).not.toHaveBeenCalled();
      unsub();
      setAutoSaveEnabled(true);
    });

    it('bleibt pending wenn offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      scheduleAutoSave('BZ');
      expect(getResourceStatus('BZ').status).toBe('pending');
      // Timer sollte nicht laufen
      vi.advanceTimersByTime(getAutoSaveDelay() + 1000);
      expect(getResourceStatus('BZ').status).toBe('pending');
    });
  });

  // ─── cancelAllPending ────────────────────────────────

  describe('cancelAllPending', () => {
    it('setzt alle pending Ressourcen auf idle', () => {
      scheduleAutoSave('BZ');
      scheduleAutoSave('EWT');
      expect(getResourceStatus('BZ').status).toBe('pending');
      expect(getResourceStatus('EWT').status).toBe('pending');

      cancelAllPending();
      expect(getResourceStatus('BZ').status).toBe('idle');
      expect(getResourceStatus('EWT').status).toBe('idle');
    });
  });

  // ─── createOnChangeHandler ───────────────────────────

  describe('createOnChangeHandler', () => {
    it('erstellt eine Handler-Funktion', () => {
      const handler = createOnChangeHandler('EWT');
      expect(typeof handler).toBe('function');
    });

    it('scheduled AutoSave wenn aufgerufen', () => {
      const handler = createOnChangeHandler('EWT');
      handler({} as never);
      expect(getResourceStatus('EWT').status).toBe('pending');
    });

    it('macht nichts wenn AutoSave deaktiviert', () => {
      setAutoSaveEnabled(false);
      const handler = createOnChangeHandler('EWT');
      handler({} as never);
      // Status sollte nicht geändert sein
      expect(getResourceStatus('EWT').status).not.toBe('pending');
      setAutoSaveEnabled(true);
    });
  });

  // ─── flushAll ────────────────────────────────────────

  describe('flushAll', () => {
    it('cancelt alle pending Timer', async () => {
      scheduleAutoSave('BZ');
      scheduleAutoSave('BE');
      await flushAll();
      // Nach flush sollten Timer gelöscht sein (status idle oder saved)
      const bzStatus = getResourceStatus('BZ').status;
      const beStatus = getResourceStatus('BE').status;
      expect(['idle', 'saved']).toContain(bzStatus);
      expect(['idle', 'saved']).toContain(beStatus);
    });
  });

  // ─── Settings speichern ──────────────────────────────

  describe('Settings AutoSave', () => {
    it('speichert Einstellungen nach Timeout', async () => {
      const mockProfile = { pers: { Vorname: 'Test' } };
      Storage.set('VorgabenU', mockProfile);
      mockUpdateMyProfile.mockResolvedValue(mockProfile);

      scheduleAutoSave('settings');
      expect(getResourceStatus('settings').status).toBe('pending');

      // Timer ablaufen lassen
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockUpdateMyProfile).toHaveBeenCalledWith(mockProfile);
      expect(getResourceStatus('settings').status).toBe('saved');
    });

    it('zeigt Fehler-Snackbar bei Settings-Fehler', async () => {
      Storage.set('VorgabenU', { test: true });
      mockUpdateMyProfile.mockRejectedValue(new Error('Profile save failed'));

      scheduleAutoSave('settings');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(getResourceStatus('settings').status).toBe('error');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Profile save failed'),
          status: 'error',
        }),
      );
    });

    it('bleibt pending bei offline Settings-Save', async () => {
      Storage.set('VorgabenU', { test: true });
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      scheduleAutoSave('settings');
      expect(getResourceStatus('settings').status).toBe('pending');

      // Sollte nicht versuchen zu speichern
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);
      expect(mockUpdateMyProfile).not.toHaveBeenCalled();
    });
  });

  // ─── saveResourceNow (via scheduleAutoSave + Timer) ──

  describe('saveResourceNow (Ressourcen-Speicherung)', () => {
    it('speichert BZ-Änderungen nach Timer-Ablauf', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const changes = { create: [{ beginB: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [{ _state: 'new', cells: { beginB: '2025-03-10T10:00:00.000Z' } }]);

      mockBzBulk.mockResolvedValue({ created: [{ _id: 'new-id-1' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBzBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          create: [
            expect.objectContaining({
              beginB: '2025-03-10T10:00:00.000Z',
              clientRequestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/i),
            }),
          ],
          delete: [],
          update: [],
        }),
        3,
        2025,
      );
      expect(getResourceStatus('BZ').status).toBe('saved');
      expect(mockAktualisiereBerechnung).toHaveBeenCalled();
    });

    it('behält andere Monate im Storage wenn nur der aktuelle Monat gespeichert wird', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [
        {
          _id: 'bz-mar',
          beginB: '2025-03-10T10:00:00.000Z',
          endeB: '2025-03-10T18:00:00.000Z',
          pauseB: 0,
        },
        {
          _id: 'bz-apr',
          beginB: '2025-04-12T10:00:00.000Z',
          endeB: '2025-04-12T18:00:00.000Z',
          pauseB: 0,
        },
      ]);

      const marchRow = {
        _id: 'bz-mar',
        beginB: '2025-03-10T11:00:00.000Z',
        endeB: '2025-03-10T19:00:00.000Z',
        pauseB: 15,
      };

      const changes = { create: [], update: [marchRow], delete: [] };
      createMockTable('tableBZ', changes, [{ _state: 'modified', _id: 'bz-mar', cells: marchRow }]);

      mockBzBulk.mockResolvedValue({
        created: [],
        updated: [
          {
            _id: 'bz-mar',
            Beginn: '2025-03-10T11:00:00.000Z',
            Ende: '2025-03-10T19:00:00.000Z',
            Pause: 15,
            updatedAt: '2025-03-10T19:00:00.000Z',
          },
        ],
        deleted: [],
        errors: [],
      });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      const stored = Storage.get<Array<{ _id: string; beginB: string }>>('dataBZ', { check: true });
      expect(stored.map(item => item._id).sort()).toEqual(['bz-apr', 'bz-mar']);
      expect(stored.find(item => item._id === 'bz-mar')?.beginB).toBe('2025-03-10T11:00:00.000Z');
    });

    it('speichert BE-Änderungen über bereitschaftseinsatzApi', async () => {
      Storage.set('Monat', 5);
      Storage.set('Jahr', 2025);
      Storage.set('dataBE', { 5: [] });

      const changes = { create: [], update: [{ _id: 'be1', tagBE: '15' }], delete: [] };
      createMockTable('tableBE', changes, [{ _state: 'modified', cells: { _id: 'be1', tagBE: '15' } }]);

      mockBeBulk.mockResolvedValue({ created: [], updated: [{ _id: 'be1' }], deleted: [], errors: [] });

      scheduleAutoSave('BE');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBeBulk).toHaveBeenCalled();
      expect(getResourceStatus('BE').status).toBe('saved');
    });

    it('speichert EWT-Änderungen über ewtApi', async () => {
      Storage.set('Monat', 1);
      Storage.set('Jahr', 2025);
      Storage.set('dataE', { 1: [] });

      const changes = { create: [{ tagE: '05' }], update: [], delete: [] };
      createMockTable('tableE', changes, [{ _state: 'new', cells: { tagE: '05' } }]);

      mockEwtBulk.mockResolvedValue({ created: [{ _id: 'ewt1' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('EWT');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockEwtBulk).toHaveBeenCalled();
      expect(getResourceStatus('EWT').status).toBe('saved');
    });

    it('nutzt bei EWT für AutoSave den Starttag-Monat statt den Buchungstag', async () => {
      Storage.set('Monat', 4);
      Storage.set('Jahr', 2026);
      Storage.set('dataE', { 4: [] });

      const changes = {
        create: [{ tagE: '2026-03-31', buchungstagE: '2026-04-01', schichtE: 'N' }],
        update: [],
        delete: [],
      };
      createMockTable('tableE', changes, [
        {
          _state: 'new',
          cells: { tagE: '2026-03-31', buchungstagE: '2026-04-01', schichtE: 'N' },
        },
      ]);

      mockEwtBulk.mockResolvedValue({ created: [{ _id: 'ewt-cross-month' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('EWT');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockEwtBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          create: [
            expect.objectContaining({
              tagE: '2026-03-31',
              buchungstagE: '2026-04-01',
              schichtE: 'N',
              clientRequestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/i),
            }),
          ],
          update: [],
          delete: [],
        }),
        3,
        2026,
      );
    });

    it('sendet EWT-Aenderungen je Starttag-Periode getrennt statt gesammelt mit einem UI-Monat', async () => {
      Storage.set('Monat', 1);
      Storage.set('Jahr', 2027);
      Storage.set('dataE', { 1: [] });

      const maerzRow = { tagE: '2026-12-31', buchungstagE: '2027-01-01', schichtE: 'N' };
      const januarRow = { tagE: '2027-01-05', buchungstagE: '2027-01-05', schichtE: 'F' };
      const changes = {
        create: [maerzRow, januarRow],
        update: [],
        delete: [],
      };
      createMockTable('tableE', changes, [
        { _state: 'new', cells: maerzRow },
        { _state: 'new', cells: januarRow },
      ]);

      mockEwtBulk.mockResolvedValue({ created: [], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('EWT');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockEwtBulk).toHaveBeenCalledTimes(2);
      expect(mockEwtBulk).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: [
            expect.objectContaining({
              ...maerzRow,
              clientRequestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/i),
            }),
          ],
          update: [],
          delete: [],
        }),
        12,
        2026,
      );
      expect(mockEwtBulk).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          create: [
            expect.objectContaining({
              ...januarRow,
              clientRequestId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/i),
            }),
          ],
          update: [],
          delete: [],
        }),
        1,
        2027,
      );
    });

    it('speichert N-Änderungen über nebengeldApi', async () => {
      Storage.set('Monat', 2);
      Storage.set('Jahr', 2025);
      Storage.set('dataN', { 2: [] });

      const changes = { create: [{ tagN: '10' }], update: [], delete: [] };
      createMockTable('tableN', changes, [{ _state: 'new', cells: { tagN: '10' } }]);

      mockNBulk.mockResolvedValue({ created: [{ _id: 'n1' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('N');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockNBulk).toHaveBeenCalled();
      expect(getResourceStatus('N').status).toBe('saved');
    });

    it('setzt Status auf idle wenn keine Änderungen vorhanden', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      createMockTable('tableBZ', { create: [], update: [], delete: [] });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBzBulk).not.toHaveBeenCalled();
      expect(getResourceStatus('BZ').status).toBe('idle');
    });

    it('schreibt wiederhergestellte Zeilen (undo-delete) sofort in localStorage', () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      // localStorage hat die Zeile nicht (wurde beim vorherigen AutoSave als 'deleted' ausgeschlossen)
      Storage.set('dataBZ', []);

      createMockTable(
        'tableBZ',
        { create: [], update: [], delete: [] },
        [
          {
            _state: 'unchanged',
            _id: 'bz-restored',
            cells: {
              _id: 'bz-restored',
              beginB: '2025-03-10T10:00:00.000Z',
              endeB: '2025-03-10T18:00:00.000Z',
              pauseB: 0,
            },
          },
        ],
      );

      scheduleAutoSave('BZ');

      const stored = Storage.get<Array<{ _id: string }>>('dataBZ', { check: true });
      expect(stored).toHaveLength(1);
      expect(stored[0]._id).toBe('bz-restored');
      expect(getResourceStatus('BZ').status).toBe('idle');
      expect(mockBzBulk).not.toHaveBeenCalled();
    });

    it('gibt zurück wenn keine Tabelle gefunden wird', async () => {
      // Kein table im DOM
      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBzBulk).not.toHaveBeenCalled();
    });

    it('zeigt Fehler-Snackbar bei Speicher-Fehler', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      const changes = { create: [{ beginB: '10:00' }], update: [], delete: [] };
      createMockTable('tableBZ', changes);

      mockBzBulk.mockRejectedValue(new Error('Server error'));

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(getResourceStatus('BZ').status).toBe('error');
      expect(getResourceStatus('BZ').lastError).toBe('Server error');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Server error'),
          status: 'error',
        }),
      );
    });

    it('aktualisiert localStorage nach erfolgreichem Save', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [{ beginB: 'old' }]);

      const changes = { create: [{ beginB: 'new' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [
        { _state: 'unchanged', cells: { beginB: 'existing' } },
        { _state: 'new', cells: { beginB: 'new' } },
      ]);

      mockBzBulk.mockResolvedValue({ created: [{ _id: 'id1' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      const stored = Storage.get<unknown[]>('dataBZ');
      expect(stored).toHaveLength(2); // Beide aktiven Zeilen
    });

    it('übernimmt serverseitig korrigierte Werte direkt in den lokalen Zustand', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataE', []);

      const changes = {
        create: [],
        update: [{ _id: 'ewt-1', tagE: '2025-03-10', buchungstagE: '2025-03-10', schichtE: 'FR' }],
        delete: [],
      };
      createMockTable('tableE', changes, [
        {
          _state: 'modified',
          _id: 'ewt-1',
          cells: { _id: 'ewt-1', tagE: '2025-03-10', buchungstagE: '2025-03-10', schichtE: 'FR' },
        },
      ]);

      mockEwtBulk.mockResolvedValue({
        created: [],
        updated: [
          {
            _id: 'ewt-1',
            Tag: '2025-03-10T00:00:00.000Z',
            Buchungstag: '2025-03-15T00:00:00.000Z',
            Schicht: 'FR',
            Monat: 3,
            Jahr: 2025,
          },
        ],
        deleted: [],
        errors: [],
      });

      scheduleAutoSave('EWT');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      const stored = Storage.get<Array<{ _id: string; buchungstagE: string }>>('dataE', { check: true });
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ _id: 'ewt-1', buchungstagE: '2025-03-15' });
    });

    it('bleibt pending bei offline und speichert nicht', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      const changes = { create: [{ beginB: '10:00' }], update: [], delete: [] };
      createMockTable('tableBZ', changes);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      scheduleAutoSave('BZ');

      // Gehe offline bevor Timer abläuft
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      // Wenn saveResourceNow aufgerufen wird und offline → pending
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      // Sollte nicht aufgerufen worden sein weil offline → pending
      expect(getResourceStatus('BZ').status).toBe('pending');
    });

    it('laesst fehlgeschlagene Create-Zeilen fuer den naechsten Retry im Change-Tracking', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const tableElement = document.createElement('table');
      tableElement.id = 'tableBZ';
      document.body.appendChild(tableElement);

      const table = createCustomTable('tableBZ', {
        columns: [
          {
            name: 'beginB',
            title: 'Beginn',
          },
        ],
        rows: [{ beginB: '2025-03-10T10:00:00.000Z' }],
      });

      const row = table.getRows()[0];
      row._state = 'new';

      mockBzBulk.mockImplementation(async bulk => ({
        created: [],
        updated: [],
        deleted: [],
        createdReferences: [],
        errors: [
          {
            operation: 'create',
            clientRequestId: bulk.create?.[0]?.clientRequestId,
            message: 'Server lehnt den Datensatz ab',
          },
        ],
      }));

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(row._state as string).toBe('error');
      expect(row._errorState).toBe('new');
      expect(row._errorMessage).toBe('Server lehnt den Datensatz ab');
      expect(table.rows.getChanges(false).create).toHaveLength(1);
      expect(document.querySelector('#tableBZ tbody tr')?.classList.contains('customtable-error')).toBe(true);
    });

    it('behaelt fehlgeschlagene Delete-Zeilen fuer manuellen Retry in der Tabelle', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [{ _id: 'bz-1', beginB: '2025-03-10T10:00:00.000Z' }]);

      const tableElement = document.createElement('table');
      tableElement.id = 'tableBZ';
      document.body.appendChild(tableElement);

      const table = createCustomTable('tableBZ', {
        columns: [
          {
            name: 'beginB',
            title: 'Beginn',
          },
        ],
        rows: [{ _id: 'bz-1', beginB: '2025-03-10T10:00:00.000Z' }],
      });

      const row = table.getRows()[0];
      row.deleteRow();

      mockBzBulk.mockResolvedValue({
        created: [],
        updated: [],
        deleted: [],
        createdReferences: [],
        errors: [
          {
            operation: 'delete',
            id: 'bz-1',
            message: 'Loeschen fehlgeschlagen',
          },
        ],
      });

      await flushAll();

      expect(table.getRows()).toHaveLength(1);
      expect(row._state).toBe('error');
      expect(row._errorState).toBe('deleted');
      expect(row.isDeleted).toBe(true);
      expect(table.rows.getChanges(true).delete).toEqual(['bz-1']);
    });
  });

  // ─── flushAll (mit Tabellen) ─────────────────────────

  describe('flushAll mit Tabellen', () => {
    it('speichert alle Ressourcen sofort', async () => {
      Storage.set('Monat', 1);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', { 1: [] });
      Storage.set('dataBE', { 1: [] });
      Storage.set('dataE', { 1: [] });
      Storage.set('dataN', { 1: [] });

      createMockTable('tableBZ', { create: [{ a: 1 }], update: [], delete: [] }, [{ _state: 'new', cells: { a: 1 } }]);
      createMockTable('tableBE', { create: [], update: [], delete: [] });
      createMockTable('tableE', { create: [], update: [], delete: [] });
      createMockTable('tableN', { create: [], update: [], delete: [] });

      mockBzBulk.mockResolvedValue({ created: [{ _id: 'id1' }], updated: [], deleted: [], errors: [] });

      await flushAll();

      expect(mockBzBulk).toHaveBeenCalled();
      expect(getResourceStatus('BZ').status).toBe('saved');
    });
  });

  // ─── Online-Retry ────────────────────────────────────

  describe('Online-Retry', () => {
    it('registriert online-Listener wenn offline scheduled wird', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      scheduleAutoSave('BZ');

      expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function), { once: true });
      addEventSpy.mockRestore();
    });
  });
});
