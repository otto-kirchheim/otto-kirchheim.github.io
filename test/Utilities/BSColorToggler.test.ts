import { beforeEach, describe, expect, it, vi } from 'bun:test';
import initializeColorModeToggler from '../../src/ts/utilities/BSColorToggler';

describe('BSColorToggler', () => {
  let mediaListeners: ((e: { matches: boolean }) => void)[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
    mediaListeners = [];

    // Mock window.matchMedia (nicht in jsdom verfügbar)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_, cb: (e: { matches: boolean }) => void) => {
          mediaListeners.push(cb);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Setup DOM für Theme-Toggler
    document.body.innerHTML = `
			<button id="bd-theme" type="button" aria-label="Toggle theme">
				<span class="theme-icon-active">dark_mode</span>
			</button>
			<span id="bd-theme-text">Theme</span>
			<button data-bs-theme-value="light"><span>light_mode</span></button>
			<button data-bs-theme-value="dark"><span>dark_mode</span></button>
			<button data-bs-theme-value="auto"><span>contrast</span></button>
		`;
  });

  it('setzt data-bs-theme auf documentElement', () => {
    initializeColorModeToggler();
    const theme = document.documentElement.getAttribute('data-bs-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  it('setzt Theme bei Klick auf Toggler-Button', () => {
    initializeColorModeToggler();

    const lightBtn = document.querySelector<HTMLButtonElement>('[data-bs-theme-value="light"]')!;
    lightBtn.click();

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it('speichert Theme in localStorage bei Klick', () => {
    initializeColorModeToggler();

    const darkBtn = document.querySelector<HTMLButtonElement>('[data-bs-theme-value="dark"]')!;
    darkBtn.click();

    expect(JSON.parse(localStorage.getItem('theme')!)).toBe('dark');
  });

  it('auto-Modus setzt Theme basierend auf prefers-color-scheme', () => {
    initializeColorModeToggler();

    const autoBtn = document.querySelector<HTMLButtonElement>('[data-bs-theme-value="auto"]')!;
    autoBtn.click();

    // In jsdom ist prefers-color-scheme nicht gesetzt, ergibt "light"
    const theme = document.documentElement.getAttribute('data-bs-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  it('liest gespeichertes Theme aus Storage beim Initialisieren', () => {
    localStorage.setItem('theme', JSON.stringify('dark'));
    initializeColorModeToggler();

    // Dark mode sollte gesetzt sein
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('wechselt Theme zwischen light und dark', () => {
    initializeColorModeToggler();

    const lightBtn = document.querySelector<HTMLButtonElement>('[data-bs-theme-value="light"]')!;
    const darkBtn = document.querySelector<HTMLButtonElement>('[data-bs-theme-value="dark"]')!;

    lightBtn.click();
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');

    darkBtn.click();
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('funktioniert wenn DOM-Elemente fehlen', () => {
    document.body.innerHTML = '';
    expect(() => initializeColorModeToggler()).not.toThrow();
  });
});
