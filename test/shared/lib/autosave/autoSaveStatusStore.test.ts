import { beforeEach, describe, expect, it, vi } from 'bun:test';

// Hoisted mock fuer autoSave.ts -- gleiches Muster wie die alte autoSaveIndicator.test.ts.
const { mockOnAutoSaveStatus } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => {
  const listeners: ((resource: string, status: string, error?: string) => void)[] = [];
  return {
    mockOnAutoSaveStatus: vi.fn((listener: (resource: string, status: string, error?: string) => void) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }),
  };
});

vi.mock('@/shared/lib/autosave/autoSave', () => ({
  onAutoSaveStatus: mockOnAutoSaveStatus,
}));

import {
  getAutoSaveSnapshot,
  resetAutoSaveStatusStore,
  subscribeAutoSaveStatus,
} from '@/shared/lib/autosave/autoSaveStatusStore';

describe('autoSaveStatusStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAutoSaveStatusStore();
  });

  it('liefert idle ohne jedes Event', () => {
    subscribeAutoSaveStatus(() => {});
    expect(getAutoSaveSnapshot(['N'])).toEqual({ status: 'idle', errorMessages: [], offline: false });
  });

  it('liefert idle fuer eine leere Ressourcenliste, auch ohne Subscriber', () => {
    expect(getAutoSaveSnapshot([])).toEqual({ status: 'idle', errorMessages: [], offline: false });
  });

  it('registriert genau einen Status-Listener bei erstem subscribe', () => {
    subscribeAutoSaveStatus(() => {});
    subscribeAutoSaveStatus(() => {});
    expect(mockOnAutoSaveStatus).toHaveBeenCalledTimes(1);
  });

  it('gibt den Status einer einzelnen Ressource zurueck', () => {
    subscribeAutoSaveStatus(() => {});
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'saving');

    expect(getAutoSaveSnapshot(['N']).status).toBe('saving');
  });

  it('priorisiert error vor blocked, saving, pending und saved (Bereitschaft BZ+BE)', () => {
    subscribeAutoSaveStatus(() => {});
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');
    listener('BE', 'blocked');
    expect(getAutoSaveSnapshot(['BZ', 'BE']).status).toBe('blocked');

    listener('BZ', 'error');
    expect(getAutoSaveSnapshot(['BZ', 'BE']).status).toBe('error');
  });

  it('sammelt Fehlermeldungen nur fuer Ressourcen im error-Status', () => {
    subscribeAutoSaveStatus(() => {});
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('EWT', 'error', 'Validierungsfehler');
    expect(getAutoSaveSnapshot(['EWT']).errorMessages).toEqual(['Validierungsfehler']);

    listener('EWT', 'saving');
    expect(getAutoSaveSnapshot(['EWT']).errorMessages).toEqual([]);
  });

  it('meldet offline anhand von navigator.onLine', () => {
    subscribeAutoSaveStatus(() => {});
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));

    expect(getAutoSaveSnapshot(['N']).offline).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    expect(getAutoSaveSnapshot(['N']).offline).toBe(false);
  });

  it('benachrichtigt Listener bei einem Status-Event', () => {
    const listenerSpy = vi.fn();
    subscribeAutoSaveStatus(listenerSpy);
    const coreListener = mockOnAutoSaveStatus.mock.calls[0][0];

    coreListener('N', 'saving');

    expect(listenerSpy).toHaveBeenCalledTimes(1);
  });

  it('meldet unsubscribe ab, weitere Events erreichen den Listener nicht mehr', () => {
    const listenerSpy = vi.fn();
    const unsubscribe = subscribeAutoSaveStatus(listenerSpy);
    const coreListener = mockOnAutoSaveStatus.mock.calls[0][0];

    unsubscribe();
    coreListener('N', 'saving');

    expect(listenerSpy).not.toHaveBeenCalled();
  });

  it('liefert denselben Snapshot bei unveraendertem Status (Referenzstabilitaet fuer useSyncExternalStore)', () => {
    subscribeAutoSaveStatus(() => {});
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];
    listener('N', 'saving');

    const erster = getAutoSaveSnapshot(['N']);
    const zweiter = getAutoSaveSnapshot(['N']);

    expect(erster).toBe(zweiter);
  });

  it('setzt Status, Fehlermeldungen und Listener bei resetAutoSaveStatusStore zurueck', () => {
    subscribeAutoSaveStatus(() => {});
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];
    listener('N', 'error', 'kaputt');
    expect(getAutoSaveSnapshot(['N']).status).toBe('error');

    resetAutoSaveStatusStore();

    expect(getAutoSaveSnapshot(['N'])).toEqual({ status: 'idle', errorMessages: [], offline: false });

    // Naechster subscribe verdrahtet den Core-Listener erneut.
    subscribeAutoSaveStatus(() => {});
    expect(mockOnAutoSaveStatus).toHaveBeenCalledTimes(2);
  });
});
