import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from '@test/reactRender';

// Hoisted mock fuer autoSave.ts -- gleiches Muster wie autoSaveStatusStore.test.ts.
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

vi.mock('@/infrastructure/autoSave/autoSave', () => ({
  onAutoSaveStatus: mockOnAutoSaveStatus,
}));

import AutoSaveBadge from '@/shared/ui/button-loading/AutoSaveBadge';
import { resetAutoSaveStatusStore } from '@/infrastructure/autoSave/autoSaveStatusStore';

/**
 * `useSyncExternalStore`s Re-Render laeuft ausserhalb eines React-Events auf der Sync-Lane,
 * die per Microtask geflusht wird -- ein direkter `listener(...)`-Aufruf im Test braucht daher
 * einen Tick, bevor das aktualisierte DOM sichtbar ist (kein `act()` in diesem Projekt, siehe
 * `reactRender.ts`s `flush()`, das fuer echte Timer denselben Zweck erfuellt).
 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function setup(resources: string[]): { container: HTMLDivElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<AutoSaveBadge resources={resources as never} />, container);
  return { container };
}

function badgeOf(container: HTMLElement): HTMLSpanElement {
  return container.querySelector('.autosave-badge') as HTMLSpanElement;
}

function iconOf(container: HTMLElement): HTMLSpanElement {
  return badgeOf(container).querySelector('.db-icon') as HTMLSpanElement;
}

describe('AutoSaveBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAutoSaveStatusStore();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('ist unsichtbar (opacity 0) solange idle', () => {
    const { container } = setup(['N']);
    expect(badgeOf(container).style.opacity).toBe('0');
  });

  it('zeigt cloud_upload/informational bei saving mit Pulse-Animation', async () => {
    const { container } = setup(['BZ']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');
    await flush();

    expect(iconOf(container).dataset['icon']).toBe('cloud_upload');
    expect(badgeOf(container).dataset['semantic']).toBe('informational');
    expect(badgeOf(container).className).toContain('autosave-pulse');
    expect(badgeOf(container).style.opacity).toBe('1');
  });

  it('zeigt exclamation_mark_circle/critical bei Datenfehler', async () => {
    const { container } = setup(['EWT']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('EWT', 'error', 'Validierungsfehler');
    await flush();

    expect(iconOf(container).dataset['icon']).toBe('exclamation_mark_circle');
    expect(badgeOf(container).dataset['semantic']).toBe('critical');
    expect(badgeOf(container).title).toBe('Validierungsfehler');
  });

  it('zeigt wifi_disabled bei Netzwerkfehler statt exclamation_mark_circle', async () => {
    const { container } = setup(['EWT']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('EWT', 'error', 'Server nicht Erreichbar');
    await flush();

    expect(iconOf(container).dataset['icon']).toBe('wifi_disabled');
  });

  it('zeigt wifi_disabled/warning bei pending+offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { container } = setup(['N']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'pending');
    await flush();

    expect(iconOf(container).dataset['icon']).toBe('wifi_disabled');
    expect(badgeOf(container).dataset['semantic']).toBe('warning');
  });

  it('priorisiert error vor saving fuer zwei Ressourcen (Bereitschaft BZ+BE)', async () => {
    const { container } = setup(['BZ', 'BE']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('BZ', 'saving');
    listener('BE', 'error');
    await flush();

    expect(iconOf(container).dataset['icon']).toBe('exclamation_mark_circle');
    expect(badgeOf(container).dataset['semantic']).toBe('critical');
  });

  it('verblasst 2s nach saved', async () => {
    const { container } = setup(['N']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'saved');
    await flush();
    expect(iconOf(container).dataset['icon']).toBe('check_circle');
    expect(badgeOf(container).style.opacity).toBe('1');

    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(badgeOf(container).style.opacity).toBe('0');
  });

  it('gibt dem Icon einen Text-Kind-Knoten, damit `.db-icon` nicht `:empty` ist', async () => {
    // DB-UX-Bug: `.db-badge > span:empty` (badge.css, fuer den reinen Punkt-Badge ohne Icon)
    // trifft ueber `:empty` versehentlich auch ein Icon-only-`.db-icon` (das Glyph sitzt im
    // `::before`, zaehlt fuer `:empty` nicht als Kind) und zwingt dessen Box auf `--badge-size`
    // statt auf die quadratische Icon-Groesse -- sichtbar verschoben/gestauchtes Glyph. `DBIcon`s
    // `text`-Prop (hier `title`, unsichtbar wegen `.db-icon`s `font-size: 0`) haelt den Span
    // nicht-leer und umgeht den Treffer von vornherein. `matches(':empty')` selbst laesst sich
    // hier nicht pruefen -- happy-doms Implementierung zaehlt nur Element-Kinder, nicht
    // Text-Knoten, und meldet daher fuer einen reinen Text-Inhalt faelschlich `true` (in echtem
    // Chrome per Puppeteer verifiziert: dort korrekt `false`). `textContent` ist der portable,
    // aussagekraeftige Teil dieser Pruefung.
    const { container } = setup(['N']);
    const listener = mockOnAutoSaveStatus.mock.calls[0][0];

    listener('N', 'saved');
    await flush();

    expect(iconOf(container).textContent).toBe('Gespeichert');
  });
});
