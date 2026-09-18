import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement } from 'react';
import { render } from '../reactRender';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { resetSnackbarStore } from '@/infrastructure/ui/snackbarStore';
import SnackbarHost from '@/infrastructure/ui/SnackbarHost';

const viCompat = vi as typeof vi & {
  advanceTimersByTimeAsync: (ms: number) => Promise<void>;
};

/**
 * `useSyncExternalStore`s Re-Render (ausgeloest durch `createSnackBar()`/`.Close()` von
 * AUSSERHALB eines React-Events) laeuft ueber die Sync-Lane, die per Microtask geflusht wird --
 * ein direkter Aufruf im Test braucht daher einen Tick, bevor das aktualisierte DOM sichtbar
 * ist (kein `act()` in diesem Projekt, siehe `test/reactRender.ts`, gleiches Muster wie
 * `AutoSaveBadge.test.tsx`).
 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// `SnackbarHost` wird EINMAL fuer die ganze Datei gemountet (nicht pro Test neu) --
// `createPortal(..., document.body)`-Inhalte gehoeren zum Fiber-Baum dieser einen Root; ein
// zwischen Tests forciertes `document.body.innerHTML = ''` wuerde Reacts eigene Buchhaltung
// dieser Root inkonsistent machen (spaetere `removeChild`-Fehler). `resetSnackbarStore()` +
// `flush()` in `beforeEach` raeumt stattdessen ueber normale Reconciliation auf.
const hostContainer = document.createElement('div');
document.body.appendChild(hostContainer);
render(createElement(SnackbarHost), hostContainer);

describe('CustomSnackbar', () => {
  beforeEach(async () => {
    resetSnackbarStore();
    await flush();
  });

  it('setzt numerische width als px-Wert', async () => {
    createSnackBar({ message: 'Test', timeout: false, width: 240 });
    await flush();

    const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.width).toBe('240px');
  });

  it('nutzt fallback auf body bei ungültigem Container-Selector und warnt', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    createSnackBar({ message: 'Fallback', timeout: false, container: '#does-not-exist' });
    await flush();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('SnackBar: Could not find target container');

    const container = document.querySelector('.CustomSnackbar-container');
    expect(container).not.toBeNull();
    expect(document.body.contains(container)).toBe(true);
    warnSpy.mockRestore();
  });

  it('verarbeitet transitionend beim Öffnen korrekt', async () => {
    createSnackBar({ message: 'Open', timeout: false });
    await flush();

    const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.opacity).toBe('1');

    wrapper?.dispatchEvent(new Event('transitionend'));
    expect(wrapper?.style.height).toBe('auto');
  });

  it('entfernt Snackbar nach Close aus dem DOM', async () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });

    const snackbar = createSnackBar({ message: 'Close', timeout: false });
    await flush();
    expect(document.querySelector('.CustomSnackbar__wrapper')).not.toBeNull();

    snackbar.Close();
    await flush();
    await viCompat.advanceTimersByTimeAsync(1000);
    await flush();

    expect(document.querySelector('.CustomSnackbar__wrapper')).toBeNull();

    rafSpy.mockRestore();
    vi.useRealTimers();
  });

  // ─── Status und Semantik ────────────────────────────────────────────────────

  describe('Status und Semantik', () => {
    it.each([
      ['success', 'successful'],
      ['green', 'successful'],
      ['warning', 'warning'],
      ['alert', 'warning'],
      ['orange', 'warning'],
      ['danger', 'critical'],
      ['error', 'critical'],
      ['red', 'critical'],
      ['info', 'informational'],
    ] as const)('status "%s" setzt data-semantic="%s"', async (status, expectedSemantic) => {
      createSnackBar({ message: 'Test', timeout: false, status });
      await flush();
      const notification = document.querySelector<HTMLDivElement>('.CustomSnackbar');
      expect(notification).not.toBeNull();
      expect(notification?.dataset.semantic).toBe(expectedSemantic);
    });

    it('leerer status bleibt neutral und ohne Symbol', async () => {
      createSnackBar({ message: 'Test', timeout: false, status: '' });
      await flush();
      const notification = document.querySelector<HTMLDivElement>('.CustomSnackbar');
      expect(notification?.dataset.semantic).toBe('adaptive');
      expect(notification?.dataset.icon).toBeUndefined();
    });
  });

  // ─── Positionsklassen ────────────────────────────────────────────────────────

  describe('Positionsklassen', () => {
    it.each([
      ['bl', 'CustomSnackbar-container--bottom-left'],
      ['tl', 'CustomSnackbar-container--top-left'],
      ['tr', 'CustomSnackbar-container--top-right'],
      ['tc', 'CustomSnackbar-container--top-center'],
      ['tm', 'CustomSnackbar-container--top-center'],
      ['bc', 'CustomSnackbar-container--bottom-center'],
      ['bm', 'CustomSnackbar-container--bottom-center'],
      ['br', 'CustomSnackbar-container--bottom-right'],
    ] as const)('position "%s" setzt Klasse %s', async (position, expectedClass) => {
      createSnackBar({ message: 'Test', timeout: false, position });
      await flush();
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains(expectedClass)).toBe(true);
    });
  });

  // ─── Aktionen ────────────────────────────────────────────────────────────────

  describe('Aktionen', () => {
    it('Aktion mit function und dismiss=true ruft function und schliesst', async () => {
      vi.useFakeTimers();
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });
      const fn = vi.fn();
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'OK', function: fn, dismiss: true }],
      });
      await flush();

      const btn = document.querySelector<HTMLButtonElement>('.CustomSnackbar__action');
      btn?.click();
      expect(fn).toHaveBeenCalledTimes(1);

      await flush();
      await viCompat.advanceTimersByTimeAsync(1000);
      await flush();
      expect(document.querySelector('.CustomSnackbar__wrapper')).toBeNull();

      rafSpy.mockRestore();
      vi.useRealTimers();
    });

    it('Aktion mit function ohne dismiss ruft nur function auf, Snackbar bleibt sichtbar', async () => {
      const fn = vi.fn();
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Aktion', function: fn }],
      });
      await flush();

      const btn = document.querySelector<HTMLButtonElement>('.CustomSnackbar__action');
      btn?.click();
      await flush();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.CustomSnackbar__wrapper')).not.toBeNull();
    });

    it('Aktion ohne function schließt Snackbar beim Klick', async () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      createSnackBar({ message: 'Test', timeout: false, actions: [{ text: 'Schließen' }] });
      await flush();

      const btn = document.querySelector<HTMLButtonElement>('.CustomSnackbar__action');
      btn?.click();
      await flush();
      await viCompat.advanceTimersByTimeAsync(1000);
      await flush();

      expect(document.querySelector('.CustomSnackbar__wrapper')).toBeNull();
      vi.useRealTimers();
    });

    it('Aktions-Klassen werden korrekt auf den Button übertragen', async () => {
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Aktion', class: ['btn-primary', 'my-class'] }],
      });
      await flush();

      const btn = document.querySelector<HTMLButtonElement>('.CustomSnackbar__action');
      expect(btn?.classList.contains('btn-primary')).toBe(true);
      expect(btn?.classList.contains('my-class')).toBe(true);
    });

    it('mehrere Aktionen werden alle gerendert', async () => {
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Ja' }, { text: 'Nein' }, { text: 'Abbrechen' }],
      });
      await flush();

      const btns = document.querySelectorAll('.CustomSnackbar__action');
      expect(btns.length).toBe(3);
      expect(btns[0].textContent).toBe('Ja');
      expect(btns[1].textContent).toBe('Nein');
      expect(btns[2].textContent).toBe('Abbrechen');
    });
  });

  // ─── Symbole ─────────────────────────────────────────────────────────────────

  describe('Symbole', () => {
    it.each([
      ['exclamation', 'exclamation_mark_triangle'],
      ['warn', 'exclamation_mark_triangle'],
      ['danger', 'exclamation_mark_triangle'],
      ['!', 'exclamation_mark_triangle'],
      ['info', 'information_circle'],
      ['question', 'question_mark_circle'],
      ['question-mark', 'question_mark_circle'],
      ['?', 'question_mark_circle'],
      ['plus', 'plus'],
      ['add', 'plus'],
      ['+', 'plus'],
    ] as const)('icon "%s" setzt data-icon="%s"', async (icon, expectedIcon) => {
      createSnackBar({ message: 'Test', timeout: false, icon });
      await flush();
      expect(document.querySelector<HTMLDivElement>('.CustomSnackbar')?.dataset.icon).toBe(expectedIcon);
    });

    it('unbekannter Name wird als DB-Symbolname durchgereicht', async () => {
      createSnackBar({ message: 'Test', timeout: false, icon: 'calendar' });
      await flush();
      expect(document.querySelector<HTMLDivElement>('.CustomSnackbar')?.dataset.icon).toBe('calendar');
    });

    it('ohne icon liefert der Status das Standardsymbol', async () => {
      createSnackBar({ message: 'Test', timeout: false, status: 'success' });
      await flush();
      const notification = document.querySelector<HTMLDivElement>('.CustomSnackbar');
      expect(notification?.dataset.icon).toBe('check_circle');
      expect(notification?.dataset.showIcon).toBe('true');
    });
  });

  // ─── Weitere Optionen ────────────────────────────────────────────────────────

  describe('Weitere Optionen', () => {
    it('dismissible=false fügt keinen Close-Button hinzu', async () => {
      createSnackBar({ message: 'Test', timeout: false, dismissible: false });
      await flush();
      expect(document.querySelector('.CustomSnackbar button[data-icon="cross"]')).toBeNull();
    });

    it('dismissible=true (Standard) fügt einen DB-Schließen-Button hinzu', async () => {
      createSnackBar({ message: 'Test', timeout: false });
      await flush();
      const closeBtn = document.querySelector<HTMLButtonElement>('.CustomSnackbar button[data-icon="cross"]');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.classList.contains('db-button')).toBe(true);
      expect(closeBtn?.textContent).toBe('Schließen');
    });

    it('titel rendert einen Kopfbereich, ohne titel bleibt er weg', async () => {
      createSnackBar({ message: 'Test', timeout: false, titel: 'Gespeichert' });
      await flush();
      const kopf = document.querySelector('[data-area="head"]');
      expect(kopf?.textContent).toBe('Gespeichert');

      resetSnackbarStore();
      await flush();
      createSnackBar({ message: 'Test', timeout: false });
      await flush();
      expect(document.querySelector('[data-area="head"]')).toBeNull();
    });

    it('Close-Button schließt Snackbar beim Klick', async () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      createSnackBar({ message: 'Test', timeout: false });
      await flush();

      const closeBtn = document.querySelector<HTMLButtonElement>('.CustomSnackbar button[data-icon="cross"]');
      closeBtn?.click();
      await flush();
      await viCompat.advanceTimersByTimeAsync(1000);
      await flush();

      expect(document.querySelector('.CustomSnackbar__wrapper')).toBeNull();
      vi.useRealTimers();
    });

    it('fixed=true setzt --fixed Klasse auf den Container', async () => {
      createSnackBar({ message: 'Test', timeout: false, fixed: true });
      await flush();
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains('CustomSnackbar-container--fixed')).toBe(true);
    });

    it('fixed=false entfernt --fixed Klasse (Standard)', async () => {
      createSnackBar({ message: 'Test', timeout: false, fixed: false });
      await flush();
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains('CustomSnackbar-container--fixed')).toBe(false);
    });

    it('speed als Zahl setzt transitionDuration in ms', async () => {
      createSnackBar({ message: 'Test', timeout: false, speed: 300 });
      await flush();
      const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
      expect(wrapper?.style.transitionDuration).toBe('300ms');
    });

    it('speed als String setzt transitionDuration direkt', async () => {
      createSnackBar({ message: 'Test', timeout: false, speed: '0.3s' });
      await flush();
      const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
      expect(wrapper?.style.transitionDuration).toBe('0.3s');
    });

    it('message wird als innerHTML gesetzt (unterstützt HTML)', async () => {
      createSnackBar({ message: '<b>Fett</b>', timeout: false });
      await flush();
      const msg = document.querySelector('.CustomSnackbar__message');
      expect(msg?.innerHTML).toBe('<b>Fett</b>');
    });

    it('Auto-Close entfernt Element nach Ablauf des Timeouts', async () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      createSnackBar({ message: 'Test', timeout: 2000 });
      await flush();
      expect(document.querySelector('.CustomSnackbar__wrapper')).not.toBeNull();

      await viCompat.advanceTimersByTimeAsync(2000);
      await flush();
      await viCompat.advanceTimersByTimeAsync(1000);
      await flush();

      expect(document.querySelector('.CustomSnackbar__wrapper')).toBeNull();
      vi.useRealTimers();
    });

    it('zweite Snackbar gleicher Position nutzt vorhandenen Container', async () => {
      createSnackBar({ message: 'Erste', timeout: false, position: 'tr' });
      createSnackBar({ message: 'Zweite', timeout: false, position: 'tr' });
      await flush();

      const containers = document.querySelectorAll('.CustomSnackbar-container--top-right');
      expect(containers.length).toBe(1);
      expect(containers[0].querySelectorAll('.CustomSnackbar').length).toBe(2);
    });

    it('zwei Snackbars verschiedener Positionen erzeugen separate Container', async () => {
      createSnackBar({ message: 'Oben', timeout: false, position: 'tr' });
      createSnackBar({ message: 'Unten', timeout: false, position: 'bl' });
      await flush();

      expect(document.querySelector('.CustomSnackbar-container--top-right')).not.toBeNull();
      expect(document.querySelector('.CustomSnackbar-container--bottom-left')).not.toBeNull();
    });

    it('HTMLElement als container wird direkt genutzt', async () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      createSnackBar({ message: 'Test', timeout: false, container: div });
      await flush();
      expect(div.querySelector('.CustomSnackbar-container')).not.toBeNull();
    });
  });
});
