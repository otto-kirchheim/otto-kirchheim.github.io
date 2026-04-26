import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { mockSetActAsUser, mockLoadUserDaten, mockGetStoredMonatJahr } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockSetActAsUser: vi.fn(),
  mockLoadUserDaten: vi.fn(),
  mockGetStoredMonatJahr: vi.fn(() => ({ monat: 3, jahr: 2026 })),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  setActAsUser: mockSetActAsUser,
}));
vi.mock('@/core/orchestration/auth/utils', () => ({
  loadUserDaten: mockLoadUserDaten,
}));
vi.mock('@/infrastructure/date/dateStorage', () => ({
  getStoredMonatJahr: mockGetStoredMonatJahr,
}));

import Storage from '@/infrastructure/storage/Storage';
import {
  clearLoadedUserResourceCache,
  loadUserDataForAdminSelection,
  loadOwnUserData,
} from '@/features/Admin/utils/actAs';

describe('actAs utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadUserDaten.mockResolvedValue(undefined);
    // hash-Setter tolerant machen
    Object.defineProperty(window, 'location', {
      value: { hash: '' },
      writable: true,
      configurable: true,
    });
  });

  describe('clearLoadedUserResourceCache', () => {
    it('entfernt alle Ressourcen-Keys aus dem Storage', () => {
      Storage.set('VorgabenU', { pers: {} });
      Storage.set('dataBZ', []);
      Storage.set('dataBE', []);
      Storage.set('dataE', []);
      Storage.set('dataN', []);
      Storage.set('datenBerechnung', {});
      Storage.set('dataServer', {});

      clearLoadedUserResourceCache();

      expect(Storage.get('VorgabenU')).toBeNull();
      expect(Storage.get('dataBZ')).toBeNull();
      expect(Storage.get('dataBE')).toBeNull();
      expect(Storage.get('dataE')).toBeNull();
      expect(Storage.get('dataN')).toBeNull();
      expect(Storage.get('datenBerechnung')).toBeNull();
      expect(Storage.get('dataServer')).toBeNull();
    });

    it('bricht nicht ab wenn Keys bereits fehlen', () => {
      expect(() => clearLoadedUserResourceCache()).not.toThrow();
    });
  });

  describe('loadUserDataForAdminSelection', () => {
    it('ruft setActAsUser, clearCache und loadUserDaten auf', async () => {
      await loadUserDataForAdminSelection('user-123', 'Max Mustermann');

      expect(mockSetActAsUser).toHaveBeenCalledWith('user-123', 'Max Mustermann');
      expect(mockLoadUserDaten).toHaveBeenCalledWith(3, 2026);
    });

    it('setzt window.location.hash auf #start', async () => {
      await loadUserDataForAdminSelection('user-456');

      expect(window.location.hash).toBe('#start');
    });

    it('löscht nach dem Aufruf die gecachten Nutzerdaten', async () => {
      Storage.set('dataBZ', [{ some: 'data' }]);

      await loadUserDataForAdminSelection('user-789');

      expect(Storage.get('dataBZ')).toBeNull();
    });
  });

  describe('loadOwnUserData', () => {
    it('ruft loadUserDataForAdminSelection mit null auf', async () => {
      await loadOwnUserData();

      expect(mockSetActAsUser).toHaveBeenCalledWith(null, undefined);
      expect(mockLoadUserDaten).toHaveBeenCalledWith(3, 2026);
    });
  });
});
