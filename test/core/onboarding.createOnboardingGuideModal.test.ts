import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

const tabShowMock = vi.fn();
const tabGetOrCreateInstanceMock = vi.fn(() => ({ show: tabShowMock }));
vi.mock('bootstrap/js/dist/tab', () => ({ default: { getOrCreateInstance: tabGetOrCreateInstanceMock } }));

const collapseShowMock = vi.fn();
const collapseGetOrCreateInstanceMock = vi.fn(() => ({ show: collapseShowMock }));
vi.mock('bootstrap/js/dist/collapse', () => ({
  default: { getOrCreateInstance: collapseGetOrCreateInstanceMock },
}));

import Storage from '@/infrastructure/storage/Storage';
import type { IVorgabenU } from '@/types';
import {
  openOnboardingGuide,
  openOnboardingGuideOnce,
} from '@/core/orchestration/onboarding/createOnboardingGuideModal';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const vorgabenU = {
  Pers: {
    Vorname: 'Jan',
    Nachname: 'Otto',
    PNummer: '76543210',
    Telefon: '0661 / 123456',
    Adress1: 'Echte Straße 5, 36251 Bad Hersfeld',
  },
  Arbeitszeit: {
    frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
    spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
    nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
    sonder: { aktiv: false, beginn: '06:00', ende: '14:30', pause: 30 },
    fahrzeit: '00:20',
  },
  Fahrzeit: [{ key: 'KS', text: 'KS', value: '01:00' }],
  VorgabenB: {},
  Einstellungen: { aktivierteTabs: [] },
} as unknown as IVorgabenU;

function getPanel(): HTMLElement | null {
  return document.querySelector('#onboarding-guide-panel');
}

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(getPanel()?.querySelectorAll('button') ?? []).find(btn => btn.textContent?.trim() === text);
}

function renderPersInputs(values: {
  Vorname: string;
  Nachname: string;
  PNummer: string;
  Telefon: string;
  Adress1: string;
}): void {
  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <input id="Vorname" value="${values.Vorname}" />
      <input id="Nachname" value="${values.Nachname}" />
      <input id="PNummer" value="${values.PNummer}" />
      <input id="Telefon" value="${values.Telefon}" />
      <input id="Adress1" value="${values.Adress1}" />
    `,
  );
}

describe('createOnboardingGuideModal (Panel)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li><button id="bereitschaft-tab" type="button"></button></li>
        <li class="d-none"><button id="ewt-tab" type="button"></button></li>
        <li><button id="neben-tab" type="button"></button></li>
        <li><button id="berechnung-tab" type="button"></button></li>
        <li><button id="einstellungen-tab" type="button"></button></li>
      </ul>
      <div id="modal"><form>bestehende Eingaben</form></div>
      <div class="accordion-item"><div id="collapseOne"></div></div>
    `;
    vi.clearAllMocks();
    Storage.remove('OnboardingAbgeschlossen');
    Storage.remove('OnboardingPersSnapshot');
    Storage.set('VorgabenU', vorgabenU);
    renderPersInputs(vorgabenU.Pers);
  });

  afterEach(() => {
    getPanel()?.remove();
  });

  it('renders into its own panel element and leaves the shared #modal untouched', () => {
    openOnboardingGuide();

    expect(getPanel()).not.toBeNull();
    expect(document.querySelector('#modal')?.textContent).toBe('bestehende Eingaben');
  });

  it('does not create a second panel when opened twice', () => {
    openOnboardingGuide();
    openOnboardingGuide();

    expect(document.querySelectorAll('#onboarding-guide-panel').length).toBe(1);
  });

  it('opens automatically exactly once via openOnboardingGuideOnce', () => {
    openOnboardingGuideOnce();
    expect(getPanel()).not.toBeNull();
    expect(Storage.get<boolean>('OnboardingAbgeschlossen', { default: false })).toBe(true);

    getPanel()?.remove();
    openOnboardingGuideOnce();
    expect(getPanel()).toBeNull();
  });

  it('enables "Weiter" on step 1 when personal data is valid and disables it when not', async () => {
    openOnboardingGuide();
    expect(findButton('Weiter')?.disabled).toBe(false);
    getPanel()?.remove();

    document.querySelector<HTMLInputElement>('#PNummer')!.value = '';
    openOnboardingGuide();
    await tick();

    expect(getPanel()?.textContent).toContain('Willkommen zur Ersteinrichtung');
    expect(findButton('Weiter')?.disabled).toBe(false);

    findButton('Weiter')?.click();
    await tick();
    expect(getPanel()?.textContent).toContain('Persönliche Daten');
    expect(getPanel()?.textContent).toContain('Noch offen:');
    expect(findButton('Weiter')?.disabled).toBe(true);
  });

  it('confirms check steps via "Passt, weiter" and walks through the tour of visible tabs', async () => {
    openOnboardingGuide();
    await tick();

    findButton('Weiter')?.click();
    await tick();
    expect(getPanel()?.textContent).toContain('Persönliche Daten');
    expect(findButton('Weiter')?.disabled).toBe(false);

    findButton('Weiter')?.click();
    await tick();
    expect(getPanel()?.textContent).toContain('Arbeitszeit prüfen');
    // Prüf-Schritt öffnet den zugehörigen Einstellungen-Bereich automatisch; Weiter ist die Bestätigung.
    expect(tabGetOrCreateInstanceMock).toHaveBeenCalled();
    expect(
      tabGetOrCreateInstanceMock.mock.calls.some(
        call =>
          (((call as unknown as unknown[]).at(0) as HTMLElement | null | undefined)?.id ?? null) ===
          'einstellungen-tab',
      ),
    ).toBe(true);

    expect(findButton('Weiter')?.disabled).toBe(false);

    findButton('Weiter')?.click();
    await tick();
    expect(getPanel()?.textContent).toContain('Bereitschaft prüfen');

    findButton('Weiter')?.click();
    await tick();
    expect(getPanel()?.textContent).toContain('Fahrzeiten prüfen');

    findButton('Weiter')?.click();
    await tick();

    // Tab-Tour: EWT ist versteckt (d-none) und darf nicht vorkommen.
    for (const [titel, _tabSelector] of [
      ['Tab: Bereitschaft', '#bereitschaft-tab'],
      ['Tab: Nebenbezüge', '#neben-tab'],
      ['Tab: Berechnung', '#berechnung-tab'],
    ] as const) {
      expect(getPanel()?.textContent).toContain(titel);
      expect(getPanel()?.textContent).not.toContain('Tab: EWT');
      expect(findButton('Weiter')?.disabled).toBe(false);
      findButton('Weiter')?.click();
      await tick();
    }

    expect(getPanel()?.textContent).toContain('Fertig!');

    findButton('Fertig')?.click();
    await tick();
    expect(getPanel()).toBeNull();
  });

  it('automatically opens the personal-data accordion on step 1 while keeping the panel', async () => {
    openOnboardingGuide();
    await tick();

    expect(tabGetOrCreateInstanceMock).toHaveBeenCalled();
    expect(
      tabGetOrCreateInstanceMock.mock.calls.some(
        call =>
          (((call as unknown as unknown[]).at(0) as HTMLElement | null | undefined)?.id ?? null) ===
          'einstellungen-tab',
      ),
    ).toBe(true);
    expect(tabShowMock).toHaveBeenCalled();
    expect(collapseGetOrCreateInstanceMock).toHaveBeenCalled();
    expect(
      collapseGetOrCreateInstanceMock.mock.calls.some(
        call =>
          (((call as unknown as unknown[]).at(0) as HTMLElement | null | undefined)?.id ?? null) === 'collapseOne',
      ),
    ).toBe(true);
    expect(collapseShowMock).toHaveBeenCalled();
    expect(document.querySelector('.accordion-item')?.classList.contains('onboarding-focus')).toBe(true);
    expect(getPanel()).not.toBeNull();
  });

  it('removes the panel on "Überspringen"', async () => {
    openOnboardingGuide();

    findButton('Überspringen')?.click();
    await tick();

    expect(getPanel()).toBeNull();
  });
});
