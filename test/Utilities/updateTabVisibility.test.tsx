import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import '@/app/features';
import AppHeader from '@/widgets/app-header/AppHeader';
import StartTab from '@/pages/start/ui/StartTab';
import { resetFeatureTabsVisible } from '@/shared/model/navigation/featureTabsStore';
import updateTabVisibility, { hideAllFeatureTabs } from '@/infrastructure/ui/updateTabVisibility';
import { render } from '@test/reactRender';

/** Nav-Eintrag ausgeblendet? (`<li>` des Nav-Knopfs; `DBHeader` rendert die Nav zweimal: Desktop + Drawer.) */
function navVersteckt(container: Element, navId: string): boolean[] {
  return [...container.querySelectorAll(`#${navId}`)].map(el => el.closest('li')!.classList.contains('d-none'));
}

const quickVersteckt = (container: Element, navId: string): boolean =>
  container.querySelector(`#quick-${navId}`)!.classList.contains('d-none');

describe('updateTabVisibility', () => {
  let header: HTMLDivElement;
  let start: HTMLDivElement;

  beforeEach(() => {
    resetFeatureTabsVisible();
    header = document.createElement('div');
    start = document.createElement('div');
    document.body.append(header, start);
    render(<AppHeader />, header);
    render(<StartTab />, start);
  });

  afterEach(() => {
    render(null, header);
    render(null, start);
    header.remove();
    start.remove();
    resetFeatureTabsVisible();
  });

  it('vor dem ersten Setzen: Nav-Eintraege sichtbar, Schnellzugriffe versteckt (bisheriges Markup)', () => {
    for (const id of ['bereitschaft-tab', 'ewt-tab', 'neben-tab', 'ea-tab'])
      expect(navVersteckt(header, id).every(v => v === false)).toBe(true);
    for (const id of ['bereitschaft-tab', 'ewt-tab', 'neben-tab', 'ea-tab'])
      expect(quickVersteckt(start, id)).toBe(true);
  });

  it('zeigt die drei Legacy-Tabs wenn aktivierteTabs undefined oder leer, EA bleibt versteckt', () => {
    for (const eingabe of [undefined, [] as string[]]) {
      hideAllFeatureTabs();
      updateTabVisibility(eingabe);
      for (const id of ['bereitschaft-tab', 'ewt-tab', 'neben-tab']) {
        expect(navVersteckt(header, id).every(v => v === false)).toBe(true);
        expect(quickVersteckt(start, id)).toBe(false);
      }
      expect(navVersteckt(header, 'ea-tab').every(v => v === true)).toBe(true);
      expect(quickVersteckt(start, 'ea-tab')).toBe(true);
    }
  });

  it('zeigt EA nur, wenn "ea" explizit in aktivierteTabs enthalten ist', () => {
    updateTabVisibility(['ea']);
    expect(navVersteckt(header, 'ea-tab').every(v => v === false)).toBe(true);
    expect(quickVersteckt(start, 'ea-tab')).toBe(false);
    expect(navVersteckt(header, 'bereitschaft-tab').every(v => v === true)).toBe(true);
  });

  it('zeigt nur bereitschaft wenn nur bereitschaft aktiv', () => {
    updateTabVisibility(['bereitschaft']);
    expect(navVersteckt(header, 'bereitschaft-tab').every(v => v === false)).toBe(true);
    for (const id of ['ewt-tab', 'neben-tab', 'ea-tab']) {
      expect(navVersteckt(header, id).every(v => v === true)).toBe(true);
      expect(quickVersteckt(start, id)).toBe(true);
    }
  });

  it('zeigt ewt und neben', () => {
    updateTabVisibility(['ewt', 'neben']);
    expect(navVersteckt(header, 'bereitschaft-tab').every(v => v === true)).toBe(true);
    expect(navVersteckt(header, 'ewt-tab').every(v => v === false)).toBe(true);
    expect(navVersteckt(header, 'neben-tab').every(v => v === false)).toBe(true);
  });

  it('ignoriert unbekannte Tab-Namen', () => {
    updateTabVisibility(['unbekannt']);
    for (const id of ['bereitschaft-tab', 'ewt-tab', 'neben-tab', 'ea-tab'])
      expect(navVersteckt(header, id).every(v => v === true)).toBe(true);
  });

  it('schaltet BEIDE Kopien um (Desktop- + Drawer-Kopie von DBHeader)', () => {
    updateTabVisibility(['bereitschaft']);
    const kopien = navVersteckt(header, 'bereitschaft-tab');
    expect(kopien.length).toBeGreaterThanOrEqual(2);
    expect(kopien.every(v => v === false)).toBe(true);
  });

  it('funktioniert ohne gerenderte Nav (kein Fehler)', () => {
    render(null, header);
    render(null, start);
    expect(() => updateTabVisibility(['bereitschaft'])).not.toThrow();
  });

  it('hideAllFeatureTabs versteckt alle Feature-Tabs und Schnellzugriffe', () => {
    updateTabVisibility(['bereitschaft', 'ewt']);
    hideAllFeatureTabs();
    for (const id of ['bereitschaft-tab', 'ewt-tab', 'neben-tab', 'ea-tab']) {
      expect(navVersteckt(header, id).every(v => v === true)).toBe(true);
      expect(quickVersteckt(start, id)).toBe(true);
    }
  });
});
