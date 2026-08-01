import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { createCustomTable } from '@/infrastructure/table/CustomTable';

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
vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('@/infrastructure/api/apiService', () => ({
  profileApi: { updateMyProfile: mockUpdateMyProfile },
  bereitschaftszeitraumApi: { bulk: mockBzBulk },
  bereitschaftseinsatzApi: { bulk: mockBeBulk },
  ewtApi: { bulk: mockEwtBulk },
  nebengeldApi: { bulk: mockNBulk },
}));

import Storage from '@/infrastructure/storage/Storage';
import {
  cancelAllPending,
  createOnChangeHandler,
  flushAll,
  flushResource,
  getAutoSaveDelay,
  getResourceStatus,
  hasPendingTableChanges,
  initAutoSaveEventListener,
  isAutoSaveEnabled,
  markResourceSaved,
  markResourcesIdle,
  onAutoSaveStatus,
  scheduleAutoSave,
  setAutoSaveDelay,
  setAutoSaveEnabled,
} from '@/infrastructure/autoSave/autoSave';
import { clearAllHooks } from '@/core/hooks';
import { onEvent, clearAllEventListeners, publishEvent } from '@/core/events/appEvents';

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
      expect(typeof status.lastSaved).toBe('number');
      expect(status.lastSaved).toBeGreaterThan(0);
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

    it('bricht einen laufenden Timer ab, wenn die Aenderungen zwischenzeitlich verschwunden sind', () => {
      const changes = { create: [{ Beginn: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      const { mockGetChanges } = createMockTable('tableBZ', changes, [
        { _state: 'new', cells: { Beginn: '2025-03-10T10:00:00.000Z' } },
      ]);

      // Erster Aufruf: Aenderungen vorhanden → Timer wird gesetzt
      scheduleAutoSave('BZ');
      expect(getResourceStatus('BZ').status).toBe('pending');

      // Aenderungen wurden inzwischen rueckgaengig gemacht (z.B. Undo) → keine create/update mehr
      mockGetChanges.mockReturnValue({ create: [], update: [], delete: [] });
      scheduleAutoSave('BZ');

      expect(getResourceStatus('BZ').status).toBe('idle');

      // Der zuvor gesetzte Timer darf nicht mehr feuern
      vi.advanceTimersByTime(getAutoSaveDelay() + 1000);
      expect(mockBzBulk).not.toHaveBeenCalled();
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

  // ─── hasPendingTableChanges ──────────────────────────

  describe('hasPendingTableChanges', () => {
    it('gibt true zurueck wenn die Tabelle offene Aenderungen hat', () => {
      createMockTable('tableBZ', { create: [{ a: 1 }], update: [], delete: [] });
      expect(hasPendingTableChanges('BZ')).toBe(true);
    });

    it('gibt false zurueck wenn keine Tabelle gefunden wird', () => {
      expect(hasPendingTableChanges('BZ')).toBe(false);
    });

    it('gibt false zurueck wenn die Tabelle keine Aenderungen hat', () => {
      createMockTable('tableBZ', { create: [], update: [], delete: [] });
      expect(hasPendingTableChanges('BZ')).toBe(false);
    });
  });

  // ─── markResourcesIdle ───────────────────────────────

  describe('markResourcesIdle', () => {
    it('setzt mehrere Ressourcen auf idle und loescht laufende Timer', () => {
      scheduleAutoSave('BZ');
      scheduleAutoSave('EWT');
      expect(getResourceStatus('BZ').status).toBe('pending');
      expect(getResourceStatus('EWT').status).toBe('pending');

      markResourcesIdle(['BZ', 'EWT']);

      expect(getResourceStatus('BZ').status).toBe('idle');
      expect(getResourceStatus('EWT').status).toBe('idle');

      // Timer wurde geloescht, ein Ablauf darf keinen Save mehr auslösen
      vi.advanceTimersByTime(getAutoSaveDelay() + 1000);
      expect(mockBzBulk).not.toHaveBeenCalled();
    });
  });

  // ─── initAutoSaveEventListener ('all') ───────────────

  describe('initAutoSaveEventListener', () => {
    it('plant AutoSave fuer alle Tabellen-Ressourcen bei resource "all"', () => {
      publishEvent('data:changed', { resource: 'all', action: 'update' });

      expect(getResourceStatus('BZ').status).toBe('pending');
      expect(getResourceStatus('BE').status).toBe('pending');
      expect(getResourceStatus('EWT').status).toBe('pending');
      expect(getResourceStatus('N').status).toBe('pending');
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
      const mockProfile = { Pers: { Vorname: 'Test' } };
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

    it('speichert mit Server-Timestamp wenn updatedAt vorhanden ist', async () => {
      const updatedAt = '2025-03-10T10:00:00.000Z';
      Storage.set('VorgabenU', { test: true });
      mockUpdateMyProfile.mockResolvedValue({ data: { test: true, fromServer: true }, updatedAt });

      scheduleAutoSave('settings');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(getResourceStatus('settings').status).toBe('saved');
      expect(Storage.get<{ test: boolean; fromServer: boolean }>('VorgabenU')).toEqual({
        test: true,
        fromServer: true,
      });
    });

    it('geht offline während ein nachgereichter Settings-Save wartet und bleibt danach pending', async () => {
      Storage.set('VorgabenU', { test: true });
      let resolveSave!: (value: { data: unknown; updatedAt?: string }) => void;
      mockUpdateMyProfile.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSave = resolve;
          }),
      );

      scheduleAutoSave('settings');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 10);
      expect(getResourceStatus('settings').status).toBe('saving');

      // Während des laufenden Saves erneut geändert → wird als "queued" vorgemerkt
      scheduleAutoSave('settings');

      // Verbindung bricht ab, bevor der nachgereichte Save starten kann
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      mockUpdateMyProfile.mockResolvedValue({ data: { test: true } });

      resolveSave({ data: { test: true } });
      await viCompat.advanceTimersByTimeAsync(10);

      // Der rekursive Retry sieht offline und bleibt pending statt erneut zu speichern
      expect(getResourceStatus('settings').status).toBe('pending');
      expect(mockUpdateMyProfile).toHaveBeenCalledTimes(1);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });
  });

  // ─── saveResourceNow (via scheduleAutoSave + Timer) ──

  describe('saveResourceNow (Ressourcen-Speicherung)', () => {
    it('speichert nachlaufende Aenderungen, die waehrend eines laufenden Saves entstehen', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const changes = { create: [{ Beginn: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      const { mockGetChanges } = createMockTable('tableBZ', changes, [
        {
          _state: 'new',
          cells: { Beginn: '2025-03-10T10:00:00.000Z' },
        },
      ]);

      setAutoSaveDelay(10);

      let resolveFirstBulk: ((value: unknown) => void) | null = null;
      mockBzBulk
        .mockImplementationOnce(
          () =>
            new Promise<unknown>(resolve => {
              resolveFirstBulk = resolve;
            }),
        )
        .mockResolvedValue({ created: [{ _id: 'new-id-2' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(15);
      expect(getResourceStatus('BZ').status).toBe('saving');
      expect(mockBzBulk).toHaveBeenCalledTimes(1);

      changes.create.push({ Beginn: '2025-03-10T11:00:00.000Z' });
      mockGetChanges.mockReturnValue(changes);
      scheduleAutoSave('BZ');

      const resolveBulk = resolveFirstBulk as ((value: unknown) => void) | null;
      resolveBulk?.({ created: [{ _id: 'new-id-1' }], updated: [], deleted: [], errors: [] });
      await Promise.resolve();
      await Promise.resolve();

      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockBzBulk).toHaveBeenCalledTimes(2);
      expect(['saved', 'idle', 'saving']).toContain(getResourceStatus('BZ').status);
    });

    it('speichert BZ-Änderungen nach Timer-Ablauf', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const changes = { create: [{ Beginn: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [{ _state: 'new', cells: { Beginn: '2025-03-10T10:00:00.000Z' } }]);

      mockBzBulk.mockResolvedValue({ created: [{ _id: 'new-id-1' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBzBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          create: [
            expect.objectContaining({
              Beginn: '2025-03-10T10:00:00.000Z',
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
          Beginn: '2025-03-10T10:00:00.000Z',
          Ende: '2025-03-10T18:00:00.000Z',
          Pause: 0,
        },
        {
          _id: 'bz-apr',
          Beginn: '2025-04-12T10:00:00.000Z',
          Ende: '2025-04-12T18:00:00.000Z',
          Pause: 0,
        },
      ]);

      const marchRow = {
        _id: 'bz-mar',
        Beginn: '2025-03-10T11:00:00.000Z',
        Ende: '2025-03-10T19:00:00.000Z',
        Pause: 15,
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

      const stored = Storage.get<Array<{ _id: string; Beginn: string }>>('dataBZ', { check: true });
      expect(stored.map(item => item._id).sort()).toEqual(['bz-apr', 'bz-mar']);
      expect(stored.find(item => item._id === 'bz-mar')?.Beginn).toBe('2025-03-10T11:00:00.000Z');
    });

    it('speichert BE-Änderungen über bereitschaftseinsatzApi', async () => {
      Storage.set('Monat', 5);
      Storage.set('Jahr', 2025);
      Storage.set('dataBE', { 5: [] });

      const changes = { create: [], update: [{ _id: 'be1', Tag: '15' }], delete: [] };
      createMockTable('tableBE', changes, [{ _state: 'modified', cells: { _id: 'be1', Tag: '15' } }]);

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

      const changes = { create: [{ Tag: '05' }], update: [], delete: [] };
      createMockTable('tableE', changes, [{ _state: 'new', cells: { Tag: '05' } }]);

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
        create: [{ Tag: '2026-03-31', Buchungstag: '2026-04-01', Schicht: 'N' }],
        update: [],
        delete: [],
      };
      createMockTable('tableE', changes, [
        {
          _state: 'new',
          cells: { Tag: '2026-03-31', Buchungstag: '2026-04-01', Schicht: 'N' },
        },
      ]);

      mockEwtBulk.mockResolvedValue({ created: [{ _id: 'ewt-cross-month' }], updated: [], deleted: [], errors: [] });

      scheduleAutoSave('EWT');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockEwtBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          create: [
            expect.objectContaining({
              Tag: '2026-03-31',
              Buchungstag: '2026-04-01',
              Schicht: 'N',
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

      const maerzRow = { Tag: '2026-12-31', Buchungstag: '2027-01-01', Schicht: 'N' };
      const januarRow = { Tag: '2027-01-05', Buchungstag: '2027-01-05', Schicht: 'F' };
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

      const changes = { create: [{ Tag: '10' }], update: [], delete: [] };
      createMockTable('tableN', changes, [{ _state: 'new', cells: { Tag: '10' } }]);

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

      createMockTable('tableBZ', { create: [], update: [], delete: [] }, [
        {
          _state: 'unchanged',
          _id: 'bz-restored',
          cells: {
            _id: 'bz-restored',
            Beginn: '2025-03-10T10:00:00.000Z',
            Ende: '2025-03-10T18:00:00.000Z',
            Pause: 0,
          },
        },
      ]);

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

    it('setzt Fehlerstatus und markiert Zeilen bei Speicher-Fehler', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      const rowObj: {
        _state: string;
        cells: Record<string, string>;
        _id: string | undefined;
        _errorState: string | undefined;
        _errorMessage: string | null;
      } = { _state: 'new', cells: { Beginn: '10:00' }, _id: undefined, _errorState: undefined, _errorMessage: null };
      const changes = { create: [{ Beginn: '10:00' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [rowObj]);

      mockBzBulk.mockRejectedValue(new Error('Server error'));

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(getResourceStatus('BZ').status).toBe('error');
      expect(getResourceStatus('BZ').lastError).toBe('Server error');
      expect(rowObj._state).toBe('error');
      expect(rowObj._errorState).toBe('new');
      expect(rowObj._errorMessage).toContain('Server error');
      expect(mockCreateSnackBar).not.toHaveBeenCalled();
    });

    it('aktualisiert localStorage nach erfolgreichem Save', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [{ Beginn: 'old' }]);

      const changes = { create: [{ Beginn: 'new' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [
        { _state: 'unchanged', cells: { Beginn: 'existing' } },
        { _state: 'new', cells: { Beginn: 'new' } },
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
        update: [{ _id: 'ewt-1', Tag: '2025-03-10', Buchungstag: '2025-03-10', Schicht: 'FR' }],
        delete: [],
      };
      createMockTable('tableE', changes, [
        {
          _state: 'modified',
          _id: 'ewt-1',
          cells: { _id: 'ewt-1', Tag: '2025-03-10', Buchungstag: '2025-03-10', Schicht: 'FR' },
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

      const stored = Storage.get<Array<{ _id: string; Buchungstag: string }>>('dataE', { check: true });
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ _id: 'ewt-1', Buchungstag: '2025-03-15' });
    });

    it('bleibt pending bei offline und speichert nicht', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      const changes = { create: [{ Beginn: '10:00' }], update: [], delete: [] };
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

    it('flushResource speichert eine Ressource sofort ohne Timer', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const changes = { create: [{ Beginn: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [{ _state: 'new', cells: { Beginn: '2025-03-10T10:00:00.000Z' } }]);

      mockBzBulk.mockResolvedValue({ created: [{ _id: 'flush-id' }], updated: [], deleted: [], errors: [] });

      await flushResource('BZ');

      expect(mockBzBulk).toHaveBeenCalled();
      expect(getResourceStatus('BZ').status).toBe('saved');
    });

    it('flushResource setzt Status auf idle wenn die Tabelle keine Aenderungen hat', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);

      createMockTable('tableBZ', { create: [], update: [], delete: [] });

      await flushResource('BZ');

      expect(mockBzBulk).not.toHaveBeenCalled();
      expect(getResourceStatus('BZ').status).toBe('idle');
    });

    it('markiert unzugeordnete Zeilen als Fehler, wenn das Backend Fehler ohne Zeilenreferenz liefert', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', []);

      const rowObj = { _state: 'new', cells: { Beginn: '2025-03-10T10:00:00.000Z' } };
      const changes = { create: [{ Beginn: '2025-03-10T10:00:00.000Z' }], update: [], delete: [] };
      createMockTable('tableBZ', changes, [rowObj]);

      // Fehler ohne clientRequestId/id/index → collectRowErrorMatches findet keine Zeile
      mockBzBulk.mockResolvedValue({
        created: [],
        updated: [],
        deleted: [],
        errors: [{ operation: 'create', message: 'Unbekannter Serverfehler' }],
      });

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(rowObj._state).toBe('error');
      expect((rowObj as { _errorMessage?: string })._errorMessage).toBe('Unbekannter Serverfehler');
      // Status bleibt trotz Fehlermarkierung "saved", da sendBulk selbst nicht geworfen hat
      expect(getResourceStatus('BZ').status).toBe('saved');
    });

    it('entfernt Nebengeld-Referenzen wenn EWT-Zeilen inklusive Loeschungen gespeichert werden', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataE', []);
      Storage.set('dataN', [{ _id: 'n1', EWT: 'ewt-del-1', Tag: '10.03.2025' }]);

      createMockTable('tableE', { create: [], update: [], delete: ['ewt-del-1'] });

      mockEwtBulk.mockResolvedValue({ created: [], updated: [], deleted: ['ewt-del-1'], errors: [] });

      await flushResource('EWT');

      expect(mockEwtBulk).toHaveBeenCalled();
      const storedN = Storage.get<Array<{ _id: string; EWT?: string }>>('dataN', { check: true });
      expect(storedN[0].EWT).toBeUndefined();
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
            name: 'Beginn',
            title: 'Beginn',
          },
        ],
        rows: [{ Beginn: '2025-03-10T10:00:00.000Z' }],
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
      Storage.set('dataBZ', [{ _id: 'bz-1', Beginn: '2025-03-10T10:00:00.000Z' }]);

      const tableElement = document.createElement('table');
      tableElement.id = 'tableBZ';
      document.body.appendChild(tableElement);

      const table = createCustomTable('tableBZ', {
        columns: [
          {
            name: 'Beginn',
            title: 'Beginn',
          },
        ],
        rows: [{ _id: 'bz-1', Beginn: '2025-03-10T10:00:00.000Z' }],
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

  // ─── Überschneidungs-Guard (overlapGuard) ────────────

  describe('Überschneidungs-Guard: AutoSave vs. ungesyncte Löschung', () => {
    it('blockiert AutoSave fuer eine neue BZ-Zeile, die eine ungesyncte Loeschung ueberschneidet', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [{ _id: 'bz-old', Beginn: '2025-03-10T08:00:00.000Z', Ende: '2025-03-11T08:00:00.000Z' }]);

      const tableElement = document.createElement('table');
      tableElement.id = 'tableBZ';
      document.body.appendChild(tableElement);

      const table = createCustomTable<{ _id?: string; Beginn: string; Ende: string }>('tableBZ', {
        columns: [
          { name: 'Beginn', title: 'Beginn' },
          { name: 'Ende', title: 'Ende' },
        ],
        rows: [{ _id: 'bz-old', Beginn: '2025-03-10T08:00:00.000Z', Ende: '2025-03-11T08:00:00.000Z' }],
      });

      const oldRow = table.getRows()[0];
      oldRow.deleteRow();
      table.rows.add({ Beginn: '2025-03-10T20:00:00.000Z', Ende: '2025-03-12T08:00:00.000Z' });
      const newRow = table.getRows().find(r => r !== oldRow)!;

      scheduleAutoSave('BZ');
      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockBzBulk).not.toHaveBeenCalled();
      expect(getResourceStatus('BZ').status).toBe('blocked');
      expect(newRow._state as string).toBe('error');
      expect(newRow._errorState).toBe('new');
      expect(newRow._errorMessage).toContain('noch nicht gespeicherten Löschung');
      // Die geloeschte Zeile selbst bleibt unangetastet (kein AutoSave-Delete, nur die neue Zeile wird markiert)
      expect(oldRow.isDeleted).toBe(true);
    });

    it('manuelles Speichern (includeDeletes) ignoriert den Guard und sendet Delete+Create zusammen', async () => {
      Storage.set('Monat', 3);
      Storage.set('Jahr', 2025);
      Storage.set('dataBZ', [{ _id: 'bz-old', Beginn: '2025-03-10T08:00:00.000Z', Ende: '2025-03-11T08:00:00.000Z' }]);

      const tableElement = document.createElement('table');
      tableElement.id = 'tableBZ';
      document.body.appendChild(tableElement);

      const table = createCustomTable<{ _id?: string; Beginn: string; Ende: string }>('tableBZ', {
        columns: [
          { name: 'Beginn', title: 'Beginn' },
          { name: 'Ende', title: 'Ende' },
        ],
        rows: [{ _id: 'bz-old', Beginn: '2025-03-10T08:00:00.000Z', Ende: '2025-03-11T08:00:00.000Z' }],
      });

      table.getRows()[0].deleteRow();
      table.rows.add({ Beginn: '2025-03-10T20:00:00.000Z', Ende: '2025-03-12T08:00:00.000Z' });

      mockBzBulk.mockResolvedValue({
        created: [{ _id: 'bz-new' }],
        updated: [],
        deleted: ['bz-old'],
        createdReferences: [],
        errors: [],
      });

      await flushResource('BZ');

      expect(mockBzBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          create: [expect.objectContaining({ Beginn: '2025-03-10T20:00:00.000Z' })],
          delete: ['bz-old'],
        }),
        3,
        2025,
      );
      expect(getResourceStatus('BZ').status).toBe('saved');
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

    it('reicht pending Ressourcen erneut ein sobald das online-Event feuert', async () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      Storage.set('VorgabenU', { test: true });
      mockUpdateMyProfile.mockResolvedValue({ data: { test: true } });

      scheduleAutoSave('settings');
      expect(getResourceStatus('settings').status).toBe('pending');

      const onlineCallback = addEventSpy.mock.calls.find(call => call[0] === 'online')?.[1] as () => void;
      expect(onlineCallback).toBeInstanceOf(Function);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      onlineCallback();

      await viCompat.advanceTimersByTimeAsync(getAutoSaveDelay() + 100);

      expect(mockUpdateMyProfile).toHaveBeenCalled();
      expect(getResourceStatus('settings').status).toBe('saved');
      addEventSpy.mockRestore();
    });
  });
});
