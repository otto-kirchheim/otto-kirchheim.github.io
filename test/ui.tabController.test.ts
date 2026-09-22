import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { getAktivenTab, setAktivenTab } from '@/shared/model/navigation/activeTabStore';
import { getAktivenAdminTab, setAktivenAdminTab } from '@/shared/model/navigation/activeAdminTabStore';
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
    <nav class="db-navigation admin-unternavigation" role="tablist">
      <menu>
        <li class="db-navigation-item" data-active="true">
          <button id="admin-tab-users" data-tab-target="admin-pane-users" role="tab" aria-selected="true" tabindex="0">Benutzerverwaltung</button>
        </li>
        <li class="db-navigation-item">
          <button id="admin-tab-logs" data-tab-target="admin-pane-logs" role="tab" aria-selected="false" tabindex="-1">Admin-Logs</button>
        </li>
      </menu>
    </nav>
    <div class="tab-content" id="admin-tab-content">
      <div class="tab-pane fade show active" id="admin-pane-users" role="tabpanel"></div>
      <div class="tab-pane fade" id="admin-pane-logs" role="tabpanel"></div>
    </div>
  `;
  document.location.hash = '';
}

beforeEach(() => {
  aufbau();
  abbauen = initTabController();
  // Phase K6: `activeTabStore`/`activeAdminTabStore` sind Modul-Singletons (ueberleben zwischen
  // Tests) -- auf den Ausgangszustand der Fixture zuruecksetzen, `setAktivenTab` feuert bei
  // Gleichheit ohnehin nicht.
  setAktivenTab('start');
  setAktivenAdminTab('admin-pane-users');
});

afterEach(() => {
  abbauen?.();
  abbauen = null;
  document.body.innerHTML = '';
});

describe('tabController', () => {
  it('schaltet Hash und activeTabStore gemeinsam um', () => {
    expect(zeigeTab('EWT')).toBe(true);

    expect(aktiverTab()).toBe('EWT');
    expect(document.location.hash).toBe('#EWT');
    // Seit K6 schreibt `zeigeTab` fuer die Hauptgruppe nicht mehr direkt `aria-selected`/
    // `data-active` auf den Schalter -- das uebernimmt `AppHeader.tsx` reaktiv via `useActiveTab()`.
    // Seit Slice 2 gilt dasselbe fuer die Pane-Klassen (`active`/`show`) -- die schreibt `App.tsx`
    // reaktiv aus demselben Store, hier ohne gemounteten React-Baum also nicht pruefbar (siehe
    // Puppeteer-Verifikation).
    expect(getAktivenTab()).toBe('EWT');
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

  it('schaltet die Admin-Unternavigation ueber activeAdminTabStore, ohne den Hash zu schreiben', () => {
    expect(zeigeTab('admin-pane-logs')).toBe(true);

    expect(getAktivenAdminTab()).toBe('admin-pane-logs');
    // Admin-Wechsel schreiben bewusst keinen Hash (nur die Hauptgruppe tut das).
    expect(document.location.hash).toBe('');
    // Store der Hauptgruppe bleibt von einem Admin-Wechsel unberuehrt.
    expect(getAktivenTab()).toBe('start');
  });

  it('haelt Hauptgruppe und Admin-Unternavigation als unabhaengige Stores', () => {
    zeigeTab('EWT');
    zeigeTab('admin-pane-logs');

    expect(getAktivenTab()).toBe('EWT');
    expect(getAktivenAdminTab()).toBe('admin-pane-logs');
  });

  it('blendet Navigationseintrag und Panel gemeinsam aus', () => {
    setzeTabSichtbar('Admin', false);

    expect(document.querySelector('#admin-tab')?.closest('li')?.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#Admin')?.classList.contains('d-none')).toBe(true);

    setzeTabSichtbar('Admin', true);

    expect(document.querySelector('#admin-tab')?.closest('li')?.classList.contains('d-none')).toBe(false);
  });
});
