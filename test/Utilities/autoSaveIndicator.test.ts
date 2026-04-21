import { beforeEach, describe, expect, it, vi } from 'bun:test';

// Hoisted mock for autoSave
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
    // Helper to trigger listeners in tests
    get listeners() {
      return listeners;
    },
  };
});

vi.mock('../../src/ts/infrastructure/autoSave/autoSave', () => ({
  onAutoSaveStatus: mockOnAutoSaveStatus,
}));

import {
  destroyAutoSaveIndicator,
  initAutoSaveIndicator,
} from '../../src/ts/infrastructure/autoSave/autoSaveIndicator';

describe('autoSaveIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM – simuliert die Speichern-Buttons aus index.html
    document.body.innerHTML = `
			<button class="btn btn-success" id="btnSaveB">
				<span class="material-icons-round big-icons">save</span>
				Speichern
			</button>
			<button class="btn btn-success" id="btnSaveE">
				<span class="material-icons-round big-icons">save</span>
				Speichern
			</button>
			<button class="btn btn-success" id="btnSaveN">
				<span class="material-icons-round big-icons">save</span>
				Speichern
			</button>
			<button class="btn btn-success" id="btnSaveEinstellungen">
				<span class="material-icons-round big-icons">save</span>
				Speichern
			</button>
		`;
    destroyAutoSaveIndicator();
    mockOnAutoSaveStatus.mockClear();
  });

  it('should create badge elements on all save buttons', () => {
    initAutoSaveIndicator();
    for (const id of ['btnSaveB', 'btnSaveE', 'btnSaveN', 'btnSaveEinstellungen']) {
      const btn = document.getElementById(id);
      expect(btn?.querySelector('.autosave-badge')).not.toBeNull();
      expect(btn?.classList.contains('position-relative')).toBe(true);
    }
  });

  it('should not create duplicate badges on double init', () => {
    initAutoSaveIndicator();
    initAutoSaveIndicator();
    const badges = document.querySelectorAll('.autosave-badge');
    expect(badges.length).toBe(4);
  });

  it('should register a status listener on init', () => {
    initAutoSaveIndicator();
    expect(mockOnAutoSaveStatus).toHaveBeenCalledTimes(1);
    expect(mockOnAutoSaveStatus).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should remove all badges on destroy', () => {
    initAutoSaveIndicator();
    expect(document.querySelectorAll('.autosave-badge').length).toBe(4);

    destroyAutoSaveIndicator();
    expect(document.querySelectorAll('.autosave-badge').length).toBe(0);
    // position-relative sollte entfernt worden sein
    for (const id of ['btnSaveB', 'btnSaveE', 'btnSaveN', 'btnSaveEinstellungen']) {
      const btn = document.getElementById(id);
      expect(btn?.classList.contains('position-relative')).toBe(false);
    }
  });

  it('should show saving badge on Bereitschaft button when BZ is saving', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');

    const badge = document.querySelector('#btnSaveB .autosave-badge') as HTMLSpanElement;
    const icon = badge.querySelector('.material-icons-round') as HTMLSpanElement;
    expect(icon.textContent).toBe('cloud_sync');
    expect(badge.classList.contains('bg-info')).toBe(true);
    expect(badge.classList.contains('autosave-pulse')).toBe(true);
    expect(badge.style.opacity).toBe('1');
  });

  it('should show error badge on EWT button when EWT has error', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('EWT', 'error');

    const badge = document.querySelector('#btnSaveE .autosave-badge') as HTMLSpanElement;
    const icon = badge.querySelector('.material-icons-round') as HTMLSpanElement;
    expect(icon.textContent).toBe('error');
    expect(badge.classList.contains('bg-danger')).toBe(true);
    expect(badge.style.opacity).toBe('1');
  });

  it('should show saved badge and fade after 2s', () => {
    vi.useFakeTimers();
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'saved');

    const badge = document.querySelector('#btnSaveN .autosave-badge') as HTMLSpanElement;
    const icon = badge.querySelector('.material-icons-round') as HTMLSpanElement;
    expect(icon.textContent).toBe('cloud_done');
    expect(badge.classList.contains('bg-success')).toBe(true);
    expect(badge.style.opacity).toBe('1');

    vi.advanceTimersByTime(2100);
    expect(badge.style.opacity).toBe('0');

    vi.useRealTimers();
  });

  it('should prioritize error over saving for Bereitschaft (BZ + BE)', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');
    listener('BE', 'error');

    const badge = document.querySelector('#btnSaveB .autosave-badge') as HTMLSpanElement;
    const icon = badge.querySelector('.material-icons-round') as HTMLSpanElement;
    expect(icon.textContent).toBe('error');
    expect(badge.classList.contains('bg-danger')).toBe(true);
  });

  it('should hide badge when status returns to idle', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');
    const badge = document.querySelector('#btnSaveB .autosave-badge') as HTMLSpanElement;
    expect(badge.style.opacity).toBe('1');

    listener('BZ', 'idle');
    expect(badge.style.opacity).toBe('0');
  });

  it('should show cloud_off with bg-warning when pending and offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'pending');

    const badge = document.querySelector('#btnSaveN .autosave-badge') as HTMLSpanElement;
    const icon = badge.querySelector('.material-icons-round') as HTMLSpanElement;
    expect(icon.textContent).toBe('cloud_off');
    expect(badge.classList.contains('bg-warning')).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('clears error message when resource transitions from error to non-error status', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('EWT', 'error', 'Validierungsfehler');
    let badge = document.querySelector('#btnSaveE .autosave-badge') as HTMLSpanElement;
    expect(badge.classList.contains('bg-danger')).toBe(true);

    listener('EWT', 'saving');
    badge = document.querySelector('#btnSaveE .autosave-badge') as HTMLSpanElement;
    // Nach dem Übergang auf saving: kein error-Icon mehr
    expect(badge.querySelector('.material-icons-round')?.textContent).toBe('cloud_sync');
    expect(badge.classList.contains('bg-danger')).toBe(false);
  });

  it('triggers badge re-render on window online event', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];
    listener('BZ', 'saving');

    window.dispatchEvent(new Event('online'));

    // Badge bleibt sichtbar nach online-Event (kein Crash)
    const badge = document.querySelector('#btnSaveB .autosave-badge') as HTMLSpanElement;
    expect(badge.style.opacity).toBe('1');
  });

  it('triggers badge re-render on window offline event', () => {
    initAutoSaveIndicator();
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];
    listener('N', 'pending');

    window.dispatchEvent(new Event('offline'));

    // Kein Crash, Badge noch vorhanden
    expect(document.querySelector('#btnSaveN .autosave-badge')).not.toBeNull();
  });

  it('removes online/offline listeners on destroy', () => {
    initAutoSaveIndicator();
    destroyAutoSaveIndicator();

    // Nach destroy kein Crash beim Dispatchen
    expect(() => window.dispatchEvent(new Event('online'))).not.toThrow();
  });
});
