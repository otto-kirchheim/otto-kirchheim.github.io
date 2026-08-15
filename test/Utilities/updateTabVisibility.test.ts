import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import updateTabVisibility, { hideAllFeatureTabs } from '@/infrastructure/ui/updateTabVisibility';

describe('updateTabVisibility', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <ul>
        <li><button id="bereitschaft-tab"></button></li>
        <li><button id="ewt-tab"></button></li>
        <li><button id="neben-tab"></button></li>
        <li><button id="ea-tab"></button></li>
      </ul>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('zeigt die drei Legacy-Tabs wenn aktivierteTabs undefined, EA bleibt versteckt', () => {
    // Erst verstecken
    document.querySelectorAll('li').forEach(li => li.classList.add('d-none'));
    updateTabVisibility();
    expect(document.querySelector('#bereitschaft-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#ewt-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#neben-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#ea-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
  });

  it('zeigt die drei Legacy-Tabs wenn aktivierteTabs leer, EA bleibt versteckt', () => {
    document.querySelectorAll('li').forEach(li => li.classList.add('d-none'));
    updateTabVisibility([]);
    expect(document.querySelector('#bereitschaft-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#ewt-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#neben-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#ea-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
  });

  it('zeigt EA nur, wenn "ea" explizit in aktivierteTabs enthalten ist', () => {
    updateTabVisibility(['ea']);
    expect(document.querySelector('#ea-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#bereitschaft-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
  });

  it('zeigt nur bereitschaft wenn nur bereitschaft aktiv', () => {
    updateTabVisibility(['bereitschaft']);
    expect(document.querySelector('#bereitschaft-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#ewt-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#neben-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#ea-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
  });

  it('zeigt ewt und neben', () => {
    updateTabVisibility(['ewt', 'neben']);
    expect(document.querySelector('#bereitschaft-tab')!.parentElement!.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#ewt-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#neben-tab')!.parentElement!.classList.contains('d-none')).toBe(false);
  });

  it('ignoriert unbekannte Tab-Namen', () => {
    updateTabVisibility(['unbekannt']);
    document.querySelectorAll('li').forEach(li => {
      expect(li.classList.contains('d-none')).toBe(true);
    });
  });

  it('funktioniert wenn DOM-Elemente fehlen', () => {
    container.remove();
    expect(() => updateTabVisibility(['bereitschaft'])).not.toThrow();
  });
});

describe('hideAllFeatureTabs', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <ul>
        <li><button id="bereitschaft-tab"></button></li>
        <li><button id="ewt-tab"></button></li>
        <li><button id="neben-tab"></button></li>
      </ul>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('versteckt alle Feature-Tabs', () => {
    hideAllFeatureTabs();
    document.querySelectorAll('li').forEach(li => {
      expect(li.classList.contains('d-none')).toBe(true);
    });
  });
});
