import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';

describe('CustomSnackbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('setzt numerische width als px-Wert', () => {
    createSnackBar({
      message: 'Test',
      timeout: false,
      width: 240,
    });

    const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.width).toBe('240px');
  });

  it('nutzt fallback auf body bei ungültigem Container-Selector und warnt', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    createSnackBar({
      message: 'Fallback',
      timeout: false,
      container: '#does-not-exist',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('SnackBar: Could not find target container');

    const container = document.querySelector('.CustomSnackbar-container');
    expect(container).not.toBeNull();
    expect(document.body.contains(container)).toBe(true);
  });

  it('verarbeitet transitionend in Open korrekt', () => {
    const snackbar = createSnackBar({
      message: 'Open',
      timeout: false,
    });

    const element = (snackbar as unknown as { _Element: HTMLDivElement })._Element;
    expect(element.style.opacity).toBe('1');

    element.dispatchEvent(new Event('transitionend'));
    expect(element.style.height).toBe('auto');
  });

  it('entfernt Snackbar nach Close aus dem Container', () => {
    vi.useFakeTimers();

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });

    const snackbar = createSnackBar({
      message: 'Close',
      timeout: false,
    });

    const container = (snackbar as unknown as { _Container: HTMLElement })._Container;
    const element = (snackbar as unknown as { _Element: HTMLDivElement })._Element;

    expect(container.contains(element)).toBe(true);

    snackbar.Close();
    vi.advanceTimersByTime(1000);

    expect(container.contains(element)).toBe(false);

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
    ] as const)('status "%s" setzt data-semantic="%s"', (status, expectedSemantic) => {
      createSnackBar({ message: 'Test', timeout: false, status });
      const notification = document.querySelector<HTMLDivElement>('.CustomSnackbar');
      expect(notification).not.toBeNull();
      expect(notification?.dataset.semantic).toBe(expectedSemantic);
    });

    it('leerer status bleibt neutral und ohne Symbol', () => {
      createSnackBar({ message: 'Test', timeout: false, status: '' });
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
    ] as const)('position "%s" setzt Klasse %s', (position, expectedClass) => {
      createSnackBar({ message: 'Test', timeout: false, position });
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains(expectedClass)).toBe(true);
    });
  });

  // ─── Aktionen ────────────────────────────────────────────────────────────────

  describe('Aktionen', () => {
    it('Aktion mit function und dismiss=true ruft function und Close auf', () => {
      const fn = vi.fn();
      const snackbar = createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'OK', function: fn, dismiss: true }],
      });

      const closeSpy = vi.spyOn(snackbar, 'Close');
      const btn = document.querySelector<HTMLSpanElement>('.CustomSnackbar__action');
      btn?.click();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('Aktion mit function ohne dismiss ruft nur function auf, Snackbar bleibt sichtbar', () => {
      const fn = vi.fn();
      const snackbar = createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Aktion', function: fn }],
      });

      const closeSpy = vi.spyOn(snackbar, 'Close');
      const btn = document.querySelector<HTMLSpanElement>('.CustomSnackbar__action');
      btn?.click();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('Aktion ohne function schließt Snackbar beim Klick', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      const snackbar = createSnackBar({ message: 'Test', timeout: false, actions: [{ text: 'Schließen' }] });
      const container = (snackbar as unknown as { _Container: HTMLElement })._Container;
      const element = (snackbar as unknown as { _Element: HTMLDivElement })._Element;

      const btn = document.querySelector<HTMLSpanElement>('.CustomSnackbar__action');
      btn?.click();
      vi.advanceTimersByTime(1000);

      expect(container.contains(element)).toBe(false);
      vi.useRealTimers();
    });

    it('Aktions-Klassen werden korrekt auf den Button übertragen', () => {
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Aktion', class: ['btn-primary', 'my-class'] }],
      });

      const btn = document.querySelector<HTMLSpanElement>('.CustomSnackbar__action');
      expect(btn?.classList.contains('btn-primary')).toBe(true);
      expect(btn?.classList.contains('my-class')).toBe(true);
    });

    it('mehrere Aktionen werden alle gerendert', () => {
      createSnackBar({
        message: 'Test',
        timeout: false,
        actions: [{ text: 'Ja' }, { text: 'Nein' }, { text: 'Abbrechen' }],
      });

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
    ] as const)('icon "%s" setzt data-icon="%s"', (icon, expectedIcon) => {
      createSnackBar({ message: 'Test', timeout: false, icon });
      expect(document.querySelector<HTMLDivElement>('.CustomSnackbar')?.dataset.icon).toBe(expectedIcon);
    });

    it('unbekannter Name wird als DB-Symbolname durchgereicht', () => {
      createSnackBar({ message: 'Test', timeout: false, icon: 'calendar' });
      expect(document.querySelector<HTMLDivElement>('.CustomSnackbar')?.dataset.icon).toBe('calendar');
    });

    it('ohne icon liefert der Status das Standardsymbol', () => {
      createSnackBar({ message: 'Test', timeout: false, status: 'success' });
      const notification = document.querySelector<HTMLDivElement>('.CustomSnackbar');
      expect(notification?.dataset.icon).toBe('check_circle');
      expect(notification?.dataset.showIcon).toBe('true');
    });
  });

  // ─── Weitere Optionen ────────────────────────────────────────────────────────

  describe('Weitere Optionen', () => {
    it('dismissible=false fügt keinen Close-Button hinzu', () => {
      createSnackBar({ message: 'Test', timeout: false, dismissible: false });
      expect(document.querySelector('.CustomSnackbar__close')).toBeNull();
    });

    it('dismissible=true (Standard) fügt einen DB-Schließen-Button hinzu', () => {
      createSnackBar({ message: 'Test', timeout: false });
      const closeBtn = document.querySelector<HTMLButtonElement>('.CustomSnackbar__close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.classList.contains('db-button')).toBe(true);
      expect(closeBtn?.dataset.icon).toBe('cross');
      expect(closeBtn?.textContent).toBe('Schließen');
    });

    it('titel rendert einen Kopfbereich, ohne titel bleibt er weg', () => {
      createSnackBar({ message: 'Test', timeout: false, titel: 'Gespeichert' });
      const kopf = document.querySelector('[data-area="head"]');
      expect(kopf?.textContent).toBe('Gespeichert');

      document.body.innerHTML = '';
      createSnackBar({ message: 'Test', timeout: false });
      expect(document.querySelector('[data-area="head"]')).toBeNull();
    });

    it('Close-Button schließt Snackbar beim Klick', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      const snackbar = createSnackBar({ message: 'Test', timeout: false });
      const container = (snackbar as unknown as { _Container: HTMLElement })._Container;
      const element = (snackbar as unknown as { _Element: HTMLDivElement })._Element;

      const closeBtn = document.querySelector<HTMLSpanElement>('.CustomSnackbar__close');
      closeBtn?.click();
      vi.advanceTimersByTime(1000);

      expect(container.contains(element)).toBe(false);
      vi.useRealTimers();
    });

    it('fixed=true setzt --fixed Klasse auf den Container', () => {
      createSnackBar({ message: 'Test', timeout: false, fixed: true });
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains('CustomSnackbar-container--fixed')).toBe(true);
    });

    it('fixed=false entfernt --fixed Klasse (Standard)', () => {
      createSnackBar({ message: 'Test', timeout: false, fixed: false });
      const container = document.querySelector('.CustomSnackbar-container');
      expect(container?.classList.contains('CustomSnackbar-container--fixed')).toBe(false);
    });

    it('speed als Zahl setzt transitionDuration in ms', () => {
      createSnackBar({ message: 'Test', timeout: false, speed: 300 });
      const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
      expect(wrapper?.style.transitionDuration).toBe('300ms');
    });

    it('speed als String setzt transitionDuration direkt', () => {
      createSnackBar({ message: 'Test', timeout: false, speed: '0.3s' });
      const wrapper = document.querySelector<HTMLDivElement>('.CustomSnackbar__wrapper');
      expect(wrapper?.style.transitionDuration).toBe('0.3s');
    });

    it('message wird als innerHTML gesetzt (unterstützt HTML)', () => {
      createSnackBar({ message: '<b>Fett</b>', timeout: false });
      const msg = document.querySelector('.CustomSnackbar__message');
      expect(msg?.innerHTML).toBe('<b>Fett</b>');
    });

    it('Auto-Close entfernt Element nach Ablauf des Timeouts', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 1;
      });

      const snackbar = createSnackBar({ message: 'Test', timeout: 2000 });
      const container = (snackbar as unknown as { _Container: HTMLElement })._Container;
      const element = (snackbar as unknown as { _Element: HTMLDivElement })._Element;

      expect(container.contains(element)).toBe(true);
      vi.advanceTimersByTime(2000 + 1000);
      expect(container.contains(element)).toBe(false);

      vi.useRealTimers();
    });

    it('zweite Snackbar gleicher Position nutzt vorhandenen Container', () => {
      createSnackBar({ message: 'Erste', timeout: false, position: 'tr' });
      createSnackBar({ message: 'Zweite', timeout: false, position: 'tr' });

      const containers = document.querySelectorAll('.CustomSnackbar-container--top-right');
      expect(containers.length).toBe(1);
      expect(containers[0].querySelectorAll('.CustomSnackbar').length).toBe(2);
    });

    it('zwei Snackbars verschiedener Positionen erzeugen separate Container', () => {
      createSnackBar({ message: 'Oben', timeout: false, position: 'tr' });
      createSnackBar({ message: 'Unten', timeout: false, position: 'bl' });

      expect(document.querySelector('.CustomSnackbar-container--top-right')).not.toBeNull();
      expect(document.querySelector('.CustomSnackbar-container--bottom-left')).not.toBeNull();
    });

    it('HTMLElement als container wird direkt genutzt', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      createSnackBar({ message: 'Test', timeout: false, container: div });
      expect(div.querySelector('.CustomSnackbar-container')).not.toBeNull();
    });
  });
});
