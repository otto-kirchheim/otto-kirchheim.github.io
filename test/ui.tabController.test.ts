import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import {
  TAB_SHOWN_EVENT,
  aktiverTab,
  initTabController,
  setzeTabSichtbar,
  zeigeTab,
  zeigeTabAusHash,
} from '@/infrastructure/ui/tabController';

let abbauen: (() => void) | null = null;

function aufbau(): void {
  document.body.innerHTML = `
    <nav class="db-navigation" role="tablist">
      <menu>
        <li class="db-navigation-item" data-active="true">
          <a role="tab" id="start-tab" href="#start" data-tab-target="start" aria-selected="true" tabindex="0">Start</a>
        </li>
        <li class="db-navigation-item">
          <a role="tab" id="ewt-tab" href="#EWT" data-tab-target="EWT" aria-selected="false" tabindex="-1">EWT</a>
        </li>
        <li class="db-navigation-item">
          <a role="tab" id="admin-tab" href="#Admin" data-tab-target="Admin" aria-selected="false" tabindex="-1">Admin</a>
        </li>
      </menu>
    </nav>
    <div class="tab-content" id="tabContent">
      <div class="tab-pane fade show active" id="start" role="tabpanel"></div>
      <div class="tab-pane fade" id="EWT" role="tabpanel"></div>
      <div class="tab-pane fade" id="Admin" role="tabpanel"></div>
    </div>
  `;
  document.location.hash = '';
}

beforeEach(() => {
  aufbau();
  abbauen = initTabController();
});

afterEach(() => {
  abbauen?.();
  abbauen = null;
  document.body.innerHTML = '';
});

describe('tabController', () => {
  it('schaltet Panel, Schalterzustand und Hash gemeinsam um', () => {
    expect(zeigeTab('EWT')).toBe(true);

    expect(aktiverTab()).toBe('EWT');
    expect(document.querySelector('#start')?.classList.contains('active')).toBe(false);
    expect(document.querySelector('#EWT')?.classList.contains('show')).toBe(true);
    expect(document.querySelector('#ewt-tab')?.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#start-tab')?.getAttribute('aria-selected')).toBe('false');
    expect(document.querySelector('#ewt-tab')?.closest('.db-navigation-item')?.getAttribute('data-active')).toBe(
      'true',
    );
    expect(document.location.hash).toBe('#EWT');
  });

  it('ignoriert unbekannte Ziele', () => {
    expect(zeigeTab('GibtEsNicht')).toBe(false);
    expect(aktiverTab()).toBe('start');
  });

  it('meldet den Wechsel als tab:shown am Schalter', () => {
    const gesehen: string[] = [];
    document.querySelector('#ewt-tab')?.addEventListener(TAB_SHOWN_EVENT, event => {
      gesehen.push((event as CustomEvent<{ id: string }>).detail.id);
    });

    zeigeTab('EWT');

    expect(gesehen).toEqual(['EWT']);
  });

  it('schaltet per Klick auf einen Navigationseintrag um', () => {
    document.querySelector<HTMLElement>('#ewt-tab')?.click();

    expect(aktiverTab()).toBe('EWT');
  });

  it('loest Deep-Links unabhaengig von Gross-/Kleinschreibung auf', () => {
    document.location.hash = '#ewt';

    expect(zeigeTabAusHash()).toBe(true);
    expect(aktiverTab()).toBe('EWT');
    // Der Hash bleibt unveraendert -- sonst entstuende beim Zurueckgehen eine Endlosschleife.
    expect(document.location.hash).toBe('#ewt');
  });

  it('blendet Navigationseintrag und Panel gemeinsam aus', () => {
    setzeTabSichtbar('Admin', false);

    expect(document.querySelector('#admin-tab')?.closest('li')?.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#Admin')?.classList.contains('d-none')).toBe(true);

    setzeTabSichtbar('Admin', true);

    expect(document.querySelector('#admin-tab')?.closest('li')?.classList.contains('d-none')).toBe(false);
  });
});
