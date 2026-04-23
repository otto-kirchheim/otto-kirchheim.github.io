import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

const { createSnackBarMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createSnackBarMock: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

import Storage from '../../src/ts/infrastructure/storage/Storage';

describe('Storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    createSnackBarMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── set / get (einfache Keys) ──────────────────────────────

  describe('set / get (einfache Keys)', () => {
    it('speichert und liest einen einfachen Wert', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.get<number>('Jahr')).toBe(2026);
    });

    it('gibt null zurück wenn Key nicht existiert', () => {
      expect(Storage.get('Jahr')).toBeNull();
    });

    it('speichert und liest ein Objekt', () => {
      const obj = { foo: 'bar', num: 42 };
      Storage.set('theme', obj);
      expect(Storage.get<typeof obj>('theme')).toEqual(obj);
    });

    it('speichert und liest ein Array', () => {
      const arr = [1, 2, 3];
      Storage.set('key', arr);
      expect(Storage.get<number[]>('key')).toEqual(arr);
    });
  });

  // ─── set / get (Ressourcen-Keys mit automatischem Wrapping) ─

  describe('set / get (Ressourcen-Keys)', () => {
    it('wrappt Ressourcen-Keys automatisch in { data, timestamp }', () => {
      const data = [{ tagE: '01.01.2026' }];
      Storage.set('dataE', data);

      const raw = JSON.parse(localStorage.getItem('dataE')!);
      expect(raw).toHaveProperty('data');
      expect(raw).toHaveProperty('timestamp');
      expect(raw.data).toEqual(data);
      expect(typeof raw.timestamp).toBe('number');
    });

    it('unwrappt Ressourcen-Keys automatisch beim Lesen', () => {
      const data = [{ tagN: '05.03.2026' }];
      Storage.set('dataN', data);
      expect(Storage.get<typeof data>('dataN')).toEqual(data);
    });

    it('migriert Altbestände ohne Wrapper und setzt Timestamp auf 0', () => {
      // Direkt ohne Wrapper in localStorage schreiben (simuliert alte Daten)
      const legacyData = { name: 'Max' };
      localStorage.setItem('VorgabenU', JSON.stringify(legacyData));

      const result = Storage.get('VorgabenU');
      expect(result).toEqual(legacyData);

      // Nach Migration sollte der Wert gewrappt gespeichert sein
      const raw = JSON.parse(localStorage.getItem('VorgabenU')!);
      expect(raw).toEqual({ data: legacyData, timestamp: 0 });
    });

    it('löst doppelt gewrappte Altbestände auf', () => {
      const innerData = { name: 'Test' };
      const doubleWrapped = {
        data: { data: innerData, timestamp: 111 },
        timestamp: 222,
      };
      localStorage.setItem('dataBZ', JSON.stringify(doubleWrapped));

      const result = Storage.get('dataBZ');
      expect(result).toEqual(innerData);

      // Korrekt gespeichert mit äußerem Timestamp
      const raw = JSON.parse(localStorage.getItem('dataBZ')!);
      expect(raw).toEqual({ data: innerData, timestamp: 222 });
    });
  });

  // ─── setWithTimestamp ───────────────────────────────────────

  describe('setWithTimestamp', () => {
    it('speichert Wert mit explizitem Timestamp', () => {
      const data = [{ tagE: '01.01.2026' }];
      Storage.setWithTimestamp('dataE', data, 1700000000000);

      const raw = JSON.parse(localStorage.getItem('dataE')!);
      expect(raw).toEqual({ data, timestamp: 1700000000000 });
    });

    it('Wert kann via get() gelesen werden', () => {
      Storage.setWithTimestamp('dataBE', { test: true }, 999);
      expect(Storage.get<{ test: boolean }>('dataBE')).toEqual({ test: true });
    });
  });

  // ─── getTimestamp ───────────────────────────────────────────

  describe('getTimestamp', () => {
    it('gibt 0 zurück für Nicht-Ressourcen-Key', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.getTimestamp('Jahr')).toBe(0);
    });

    it('gibt 0 zurück wenn Key nicht existiert', () => {
      expect(Storage.getTimestamp('dataBZ')).toBe(0);
    });

    it('gibt den Timestamp einer gespeicherten Ressource zurück', () => {
      Storage.setWithTimestamp('dataE', [], 1700000000000);
      expect(Storage.getTimestamp('dataE')).toBe(1700000000000);
    });

    it('gibt 0 zurück bei ungültigem JSON', () => {
      localStorage.setItem('dataN', 'kein-json{{{');
      expect(Storage.getTimestamp('dataN')).toBe(0);
    });

    it('gibt 0 zurück bei Objekt ohne timestamp-Feld', () => {
      localStorage.setItem('VorgabenU', JSON.stringify({ foo: 'bar' }));
      expect(Storage.getTimestamp('VorgabenU')).toBe(0);
    });
  });

  // ─── get mit Options-Objekt ─────────────────────────────────

  describe('get mit Options', () => {
    it('gibt default-Wert zurück wenn Key fehlt', () => {
      expect(Storage.get('Jahr', { default: 2025 })).toBe(2025);
    });

    it('gibt gespeicherten Wert zurück statt default wenn Key existiert', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.get('Jahr', { default: 2025 })).toBe(2026);
    });

    it('wirft Fehler mit check: true wenn Key fehlt', () => {
      expect(() => Storage.get('Monat', { check: true })).toThrow('"Monat" nicht gefunden');
      expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('gibt Wert zurück mit check: true wenn Key existiert', () => {
      Storage.set('Monat', 3);
      expect(Storage.get<number>('Monat', { check: true })).toBe(3);
    });
  });

  // ─── get mit checked = true ─────────────────────────────────

  describe('get mit checked = true', () => {
    it('wirft Fehler und zeigt Snackbar wenn Key fehlt', () => {
      expect(() => Storage.get('Jahr', true)).toThrow('"Jahr" nicht gefunden');
      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Jahr'),
          status: 'error',
        }),
      );
    });

    it('gibt Wert zurück wenn Key existiert', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.get<number>('Jahr', true)).toBe(2026);
    });
  });

  // ─── get: Nicht-JSON-String (convertToJson) ─────────────────

  describe('get: Nicht-JSON-String im localStorage', () => {
    it('konvertiert Nicht-JSON-String und speichert ihn als JSON', () => {
      // Direkt einen nicht-JSON-Wert setzen
      localStorage.setItem('Benutzer', 'Max Mustermann');
      const result = Storage.get('Benutzer');
      expect(result).toBe('Max Mustermann');

      // Sollte jetzt als JSON gespeichert sein
      const raw = localStorage.getItem('Benutzer');
      expect(raw).toBe('"Max Mustermann"');
    });
  });

  // ─── remove ─────────────────────────────────────────────────

  describe('remove', () => {
    it('entfernt einen Key', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.check('Jahr')).toBe(true);
      Storage.remove('Jahr');
      expect(Storage.check('Jahr')).toBe(false);
    });
  });

  // ─── clear ──────────────────────────────────────────────────

  describe('clear', () => {
    it('entfernt alle Keys', () => {
      Storage.set('Jahr', 2026);
      Storage.set('Monat', 'März');
      expect(Storage.size()).toBe(2);
      Storage.clear();
      expect(Storage.size()).toBe(0);
    });
  });

  // ─── check ──────────────────────────────────────────────────

  describe('check', () => {
    it('gibt false zurück wenn Key nicht existiert', () => {
      expect(Storage.check('Jahr')).toBe(false);
    });

    it('gibt true zurück wenn Key existiert', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.check('Jahr')).toBe(true);
    });
  });

  // ─── size ───────────────────────────────────────────────────

  describe('size', () => {
    it('gibt 0 für leeren Storage', () => {
      expect(Storage.size()).toBe(0);
    });

    it('gibt korrekte Anzahl', () => {
      Storage.set('Jahr', 2026);
      Storage.set('Monat', 'März');
      expect(Storage.size()).toBe(2);
    });
  });

  // ─── compare ────────────────────────────────────────────────

  describe('compare', () => {
    it('gibt true bei gleichen Werten (primitiv)', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.compare('Jahr', 2026)).toBe(true);
    });

    it('gibt false bei ungleichen Werten', () => {
      Storage.set('Jahr', 2026);
      expect(Storage.compare('Jahr', 2025)).toBe(false);
    });

    it('gibt false wenn Key nicht existiert', () => {
      expect(Storage.compare('Jahr', 2026)).toBe(false);
    });

    it('gibt true bei gleichen Objekten (unabhängig von Key-Reihenfolge)', () => {
      Storage.set('key', { b: 2, a: 1 });
      expect(Storage.compare('key', { a: 1, b: 2 })).toBe(true);
    });

    it('gibt true bei gleichen Arrays', () => {
      Storage.set('key', [1, 2, 3]);
      expect(Storage.compare('key', [1, 2, 3])).toBe(true);
    });

    it('gibt false bei ungleichen Objekten', () => {
      Storage.set('key', { a: 1 });
      expect(Storage.compare('key', { a: 2 })).toBe(false);
    });

    it('vergleicht korrekt mit null/undefined', () => {
      Storage.set('key', null);
      expect(Storage.compare('key', null)).toBe(true);
      expect(Storage.compare('key', undefined)).toBe(false);
    });

    it('vergleicht Nicht-JSON-String im Storage', () => {
      localStorage.setItem('Benutzer', 'Max');
      expect(Storage.compare('Benutzer', 'Max')).toBe(true);
    });
  });

  // ─── Singleton ──────────────────────────────────────────────

  describe('Singleton', () => {
    it('gibt immer dieselbe Instanz zurück', async () => {
      const { default: Storage1 } = await import('../../src/ts/infrastructure/storage/Storage');
      const { default: Storage2 } = await import('../../src/ts/infrastructure/storage/Storage');
      expect(Storage1).toBe(Storage2);
    });
  });
});
