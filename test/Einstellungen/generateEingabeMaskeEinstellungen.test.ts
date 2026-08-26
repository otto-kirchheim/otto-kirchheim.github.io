import { afterEach, describe, expect, it, vi } from 'bun:test';

vi.mock('@/features/Einstellungen/utils', () => ({
  generateEingabeTabelleEinstellungenVorgabenB: vi.fn(),
  saveTableDataVorgabenU: vi.fn(),
  setMonatJahr: vi.fn(),
}));

vi.mock('@/features/Bereitschaft/utils/constants', () => ({
  BereitschaftsEinsatzZeiträume: {},
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: vi.fn(), set: vi.fn(), check: vi.fn() },
}));

import {
  default as generateEingabeMaskeEinstellungen,
  formatDelayLabel,
  msToSliderPosition,
  sliderPositionToMs,
} from '@/features/Einstellungen/utils/generateEingabeMaskeEinstellungen';
import { ZULAGEN_CATALOG, ZulageCategory } from '@/features/Einstellungen/utils/zulagenCatalog';
import type { IVorgabenU } from '@/types';
import { CustomTable } from '@/infrastructure/table/CustomTable';
import type { IVorgabenUvorgabenB } from '@/core/types';
import { saveTableDataVorgabenU } from '@/features/Einstellungen/utils';
import Storage from '@/infrastructure/storage/Storage';

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── formatDelayLabel ────────────────────────────────────────────────────────

describe('formatDelayLabel', () => {
  it('zeigt ms unter 1000ms', () => {
    expect(formatDelayLabel(0)).toBe('0 ms');
    expect(formatDelayLabel(500)).toBe('500 ms');
    expect(formatDelayLabel(999)).toBe('999 ms');
  });

  it('zeigt Sekunden zwischen 1000 und 59999ms', () => {
    expect(formatDelayLabel(1000)).toBe('1 s');
    expect(formatDelayLabel(5000)).toBe('5 s');
    expect(formatDelayLabel(59999)).toBe('60 s');
  });

  it('zeigt Minuten ab 60000ms', () => {
    expect(formatDelayLabel(60000)).toBe('1 min');
    expect(formatDelayLabel(120000)).toBe('2 min');
    expect(formatDelayLabel(300000)).toBe('5 min');
  });
});

// ─── sliderPositionToMs ──────────────────────────────────────────────────────

describe('sliderPositionToMs', () => {
  it('Position 0 → 1s', () => expect(sliderPositionToMs(0)).toBe(1000));
  it('Position 9 → 10s', () => expect(sliderPositionToMs(9)).toBe(10000));
  it('Position 10 → 15s (5s-Bereich Start)', () => expect(sliderPositionToMs(10)).toBe(15000));
  it('Position 14 → 35s', () => expect(sliderPositionToMs(14)).toBe(35000));
  it('Position 19 → 60s (5s-Bereich Ende)', () => expect(sliderPositionToMs(19)).toBe(60000));
  it('Position 20 → 60s (1min-Bereich Start)', () => expect(sliderPositionToMs(20)).toBe(60000));
  it('Position 21 → 120s', () => expect(sliderPositionToMs(21)).toBe(120000));
  it('Position 24 → 300s (Maximum)', () => expect(sliderPositionToMs(24)).toBe(300000));

  it('klemmt negative Position auf 0', () => expect(sliderPositionToMs(-5)).toBe(1000));
  it('klemmt Position > 24 auf 24', () => expect(sliderPositionToMs(99)).toBe(300000));
});

// ─── msToSliderPosition ──────────────────────────────────────────────────────

describe('msToSliderPosition', () => {
  it('1000ms → Position 0', () => expect(msToSliderPosition(1000)).toBe(0));
  it('5000ms → Position 4', () => expect(msToSliderPosition(5000)).toBe(4));
  it('10000ms → Position 9', () => expect(msToSliderPosition(10000)).toBe(9));
  it('15000ms → Position 10', () => expect(msToSliderPosition(15000)).toBe(10));
  it('35000ms → Position 14', () => expect(msToSliderPosition(35000)).toBe(14));
  it('60000ms im 15-60s-Bereich → Position 19', () => expect(msToSliderPosition(60000)).toBe(19));
  it('120000ms → Position 21', () => expect(msToSliderPosition(120000)).toBe(21));
  it('300000ms → Position 24', () => expect(msToSliderPosition(300000)).toBe(24));
});

// ─── Roundtrip ───────────────────────────────────────────────────────────────

describe('sliderPositionToMs / msToSliderPosition Roundtrip', () => {
  it.each([0, 5, 9, 10, 15, 19, 22, 24] as const)('Position %i bleibt nach Roundtrip gleich', (pos: number) => {
    const ms = sliderPositionToMs(pos);
    expect(msToSliderPosition(ms)).toBe(pos);
  });
});

// ─── Zulagen-Limits in der Einstellungen-Maske ─────────────────────────────

describe('generateEingabeMaskeEinstellungen - Zulagen Limits', () => {
  function buildVorgabenU(benoetigteZulagen: string[] = []): IVorgabenU {
    return {
      Pers: {
        Vorname: '',
        Nachname: '',
        PNummer: '',
        Telefon: '',
        Adress1: '',
        Adress2: '',
        ErsteTkgSt: '',
        ErsteTkgStAdresse: '',
        Bundesland: 'HE',
        Betrieb: '',
        OE: '',
        Gewerk: '',
        kmArbeitsort: 0,
        nBhf: '',
        kmnBhf: 0,
        TB: 'Tarifkraft',
      },
      Arbeitszeit: {
        frueh: { aktiv: true, default: { beginn: '00:00', ende: '00:00', pause: 30 } },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
        sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
        fahrzeit: '00:00',
      },
      Fahrzeit: [],
      VorgabenB: {},
      Einstellungen: {
        aktivierteTabs: [],
        benoetigteZulagen,
      },
    };
  }

  function setupDomShell(): void {
    const fahrzeitenPanel = document.createElement('div');
    fahrzeitenPanel.id = 'fahrzeiten-panel';
    document.body.appendChild(fahrzeitenPanel);

    const collapse = document.createElement('div');
    collapse.id = 'collapseFive';
    document.body.appendChild(collapse);

    const list = document.createElement('div');
    list.id = 'settings-zulagen-list';
    document.body.appendChild(list);

    const table = document.createElement('table');
    table.id = 'tableVE';
    document.body.appendChild(table);
  }

  it('begrenzt Erschwerniszulagen auf max. 7 bei Initialwerten', () => {
    setupDomShell();

    const erschwernisCodes = ZULAGEN_CATALOG.filter(item => item.category === ZulageCategory.Erschwerniszulage)
      .slice(0, 8)
      .map(item => item.code);

    generateEingabeMaskeEinstellungen(buildVorgabenU(erschwernisCodes));

    const checkedErschwernis = ZULAGEN_CATALOG.filter(item => item.category === ZulageCategory.Erschwerniszulage)
      .map(item =>
        document.querySelector<HTMLInputElement>(`#settings-zulagen-list input[data-zulage-code="${item.code}"]`),
      )
      .filter((input): input is HTMLInputElement => Boolean(input?.checked));

    expect(checkedErschwernis.length).toBe(7);
  });

  it('deaktiviert weitere Erschwerniszulagen nach 7 Selektionen und aktiviert bei Abwahl wieder', () => {
    setupDomShell();
    generateEingabeMaskeEinstellungen(buildVorgabenU());

    const erschwernisInputs = ZULAGEN_CATALOG.filter(item => item.category === ZulageCategory.Erschwerniszulage)
      .slice(0, 8)
      .map(item =>
        document.querySelector<HTMLInputElement>(`#settings-zulagen-list input[data-zulage-code="${item.code}"]`),
      )
      .filter((input): input is HTMLInputElement => Boolean(input));

    expect(erschwernisInputs.length).toBe(8);

    for (const input of erschwernisInputs.slice(0, 7)) {
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    }

    const eighth = erschwernisInputs[7];
    expect(eighth.disabled).toBe(true);

    const first = erschwernisInputs[0];
    first.checked = false;
    first.dispatchEvent(new Event('change'));

    expect(eighth.disabled).toBe(false);
  });

  it('rendert Zulagen in sichtbaren Kategorie-Sektionen mit Limit-Hinweis', () => {
    setupDomShell();
    generateEingabeMaskeEinstellungen(buildVorgabenU());

    const sections = document.querySelectorAll<HTMLElement>('#settings-zulagen-list [data-zulage-category-section]');
    expect(sections.length).toBe(3);
    expect(sections[0]?.dataset.zulageCategorySection).toBe('erschwerniszulage');

    const erschwernisSection = document.querySelector<HTMLElement>(
      '#settings-zulagen-list [data-zulage-category-section="erschwerniszulage"]',
    );
    const leistungSection = document.querySelector<HTMLElement>(
      '#settings-zulagen-list [data-zulage-category-section="leistungspramie-und-fahrentschaedigung"]',
    );
    const reinigungSection = document.querySelector<HTMLElement>(
      '#settings-zulagen-list [data-zulage-category-section="ganzkoerperreinigung"]',
    );

    expect(erschwernisSection?.textContent).toContain('Erschwerniszulagen');
    expect(erschwernisSection?.textContent).toContain('Max. 7 gleichzeitig');
    expect(leistungSection?.textContent).toContain('Leistungsprämie u. Fahrentschädigung');
    expect(leistungSection?.textContent).toContain('Max. 3 gleichzeitig');
    expect(reinigungSection?.textContent).toContain('Ganzkörperreinigung');
    expect(reinigungSection?.textContent).toContain('Max. 1 gleichzeitig');
  });
});

// ─── Vollständige Maske: Tätigkeitsstätten-Tabelle, Arbeitszeit-Panel, ─────────
// ─── persönliche Felder, Tab-Checkboxen, AutoSave, CustomTable-Instanz ─────────

describe('generateEingabeMaskeEinstellungen - vollständige Maske', () => {
  function buildFullVorgabenU(): IVorgabenU {
    return {
      Pers: {
        Vorname: 'Erika',
        Nachname: 'Musterfrau',
        PNummer: '',
        Telefon: '',
        Adress1: '',
        Adress2: '',
        ErsteTkgSt: '',
        ErsteTkgStAdresse: '',
        Bundesland: 'HE',
        Betrieb: '',
        OE: '',
        Gewerk: '',
        kmArbeitsort: 0,
        nBhf: '',
        kmnBhf: 0,
        TB: 'Tarifkraft',
      },
      Arbeitszeit: {
        frueh: { aktiv: true, default: { beginn: '00:00', ende: '00:00', pause: 30 } },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
        sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
        fahrzeit: '00:00',
      },
      Fahrzeit: [{ key: 'Kaiserau', text: 'km 167,0', value: '00:10' }],
      VorgabenB: {},
      Einstellungen: {
        aktivierteTabs: ['ewt'],
        benoetigteZulagen: [],
        autoSaveEnabled: false,
        autoSaveDelayMs: 15000,
      },
    };
  }

  function setupFullDomShell(): void {
    document.body.innerHTML = `
      <input id="Vorname" />
      <input id="Nachname" />
      <input id="EmailAnzeige" />
      <div id="arbeitszeit-panel"></div>
      <div id="collapseFive">
        <input type="checkbox" data-tab-key="bereitschaft" />
        <input type="checkbox" data-tab-key="ewt" />
      </div>
      <input type="checkbox" id="autoSaveEnabled" />
      <input id="autoSaveDelay" />
      <span id="autoSaveDelayLabel"></span>
    `;

    const fahrzeitenPanel = document.createElement('div');
    fahrzeitenPanel.id = 'fahrzeiten-panel';
    document.body.appendChild(fahrzeitenPanel);

    const list = document.createElement('div');
    list.id = 'settings-zulagen-list';
    document.body.appendChild(list);

    const table = document.createElement('table');
    table.id = 'tableVE';
    document.body.appendChild(table);
  }

  it('befüllt Tätigkeitsstätten-Tabelle, persönliche Felder, Tabs, AutoSave-Einstellungen und nutzt eine echte CustomTable-Instanz', () => {
    setupFullDomShell();
    (Storage.get as ReturnType<typeof vi.fn>).mockReturnValue('erika@example.com');

    // Reale CustomTable-Instanz an #tableVE binden, damit der `ftVE instanceof CustomTable`-Zweig greift.
    new CustomTable<IVorgabenUvorgabenB>('tableVE', {
      columns: [{ name: 'Name', title: 'Name' }],
      rows: [],
      sorting: { enabled: false },
    });

    generateEingabeMaskeEinstellungen(buildFullVorgabenU());

    // renderFahrzeitenPanel: Preact-Panel rendert genau die fZ-Zeilen (keine fixen Leerzeilen mehr).
    const fahrzeitenPanel = document.querySelector<HTMLDivElement>('#fahrzeiten-panel');
    const fahrzeitenRows = fahrzeitenPanel?.querySelectorAll('tbody tr');
    expect(fahrzeitenRows?.length).toBe(1);
    const firstRowInputs = fahrzeitenRows?.[0]?.querySelectorAll<HTMLInputElement>('input');
    expect(firstRowInputs?.[0]?.value).toBe('Kaiserau');

    // renderArbeitszeiteingabePanel: Preact-Panel wurde ins Ziel-Div gerendert.
    const panel = document.querySelector<HTMLDivElement>('#arbeitszeit-panel');
    expect(panel?.innerHTML.length).toBeGreaterThan(0);

    // setElementValues / isNumberOrString: persönliche Felder wurden befüllt.
    expect(document.querySelector<HTMLInputElement>('#Vorname')?.value).toBe('Erika');
    expect(document.querySelector<HTMLInputElement>('#Nachname')?.value).toBe('Musterfrau');

    // populateEmailField
    expect(document.querySelector<HTMLInputElement>('#EmailAnzeige')?.value).toBe('erika@example.com');

    // populateTabCheckboxes
    const tabCheckboxes = document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]');
    expect(tabCheckboxes[0]?.checked).toBe(false);
    expect(tabCheckboxes[1]?.checked).toBe(true);

    // populateAutoSaveSettings: Initialzustand aus VorgabenU.Einstellungen.
    const enabledCheckbox = document.querySelector<HTMLInputElement>('#autoSaveEnabled');
    const delayInput = document.querySelector<HTMLInputElement>('#autoSaveDelay');
    const delayLabel = document.querySelector<HTMLElement>('#autoSaveDelayLabel');
    expect(enabledCheckbox?.checked).toBe(false);
    expect(delayInput?.value).toBe(String(msToSliderPosition(15000)));
    expect(delayLabel?.textContent).toBe(formatDelayLabel(sliderPositionToMs(msToSliderPosition(15000))));

    // Live-Update-Listener des Sliders (Zeilen 309-317).
    if (!delayInput) throw new Error('delayInput fehlt');
    delayInput.value = '20';
    delayInput.dispatchEvent(new Event('input'));
    expect(delayInput.dataset.actualMs).toBe(String(sliderPositionToMs(20)));
    expect(delayLabel?.textContent).toBe(formatDelayLabel(sliderPositionToMs(20)));

    // CustomTable-Zweig: rows.load + saveTableDataVorgabenU wurden aufgerufen.
    expect(saveTableDataVorgabenU).toHaveBeenCalled();
  });
});
