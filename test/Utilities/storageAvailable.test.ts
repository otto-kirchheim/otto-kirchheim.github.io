import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import storageAvailable from '../../src/ts/utilities/storageAvailable';

describe('storageAvailable', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // localStorage wiederherstellen falls überschrieben
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('gibt true zurück wenn localStorage verfügbar ist', () => {
    expect(storageAvailable('localStorage')).toBe(true);
  });

  it('gibt true zurück wenn sessionStorage verfügbar ist', () => {
    expect(storageAvailable('sessionStorage')).toBe(true);
  });

  it('gibt true zurück bei QuotaExceededError wenn Storage Items hat', () => {
    const mockStorage = {
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: vi.fn(),
      length: 5, // Items vorhanden
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    expect(storageAvailable('localStorage')).toBe(true);
  });

  it('gibt false zurück bei QuotaExceededError wenn Storage leer ist', () => {
    const mockStorage = {
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: vi.fn(),
      length: 0, // Leer
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    expect(storageAvailable('localStorage')).toBe(false);
  });

  it('gibt true zurück bei NS_ERROR_DOM_QUOTA_REACHED (Firefox) wenn Storage Items hat', () => {
    const mockStorage = {
      setItem: () => {
        throw new DOMException('Quota reached', 'NS_ERROR_DOM_QUOTA_REACHED');
      },
      removeItem: vi.fn(),
      length: 3,
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    expect(storageAvailable('localStorage')).toBe(true);
  });

  it('gibt false zurück bei normalem Error (kein DOMException)', () => {
    const mockStorage = {
      setItem: () => {
        throw new Error('some random error');
      },
      removeItem: vi.fn(),
      length: 5,
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    expect(storageAvailable('localStorage')).toBe(false);
  });

  it('gibt false zurück bei allgemeinem Fehler ohne storage', () => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('not available');
      },
      configurable: true,
    });

    expect(storageAvailable('localStorage')).toBe(false);
  });

  it('gibt false zurück bei DOMException mit anderem Namen', () => {
    const mockStorage = {
      setItem: () => {
        throw new DOMException('Security error', 'SecurityError');
      },
      removeItem: vi.fn(),
      length: 5,
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    expect(storageAvailable('localStorage')).toBe(false);
  });
});
