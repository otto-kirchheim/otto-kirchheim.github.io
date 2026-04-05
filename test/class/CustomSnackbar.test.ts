import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createSnackBar } from '../../src/ts/class/CustomSnackbar';

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
});
