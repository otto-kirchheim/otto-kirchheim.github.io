import '../setupBun';
import { beforeEach, describe, expect, it } from 'bun:test';
import saveEinstellungen from '@/features/Einstellungen/utils/saveEinstellungen';
import type { IVorgabenU } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage';

function createVorgabenU(): IVorgabenU {
  return {
    pers: {
      Vorname: 'Max',
      Nachname: 'Mustermann',
      PNummer: '01234567',
      Telefon: '0123456789',
      Adress1: 'Musterstraße 17, 12345 Musterstadt',
      Adress2: '',
      ErsteTkgSt: 'Kirchheim',
      ErsteTkgStAdresse: 'Beiersgraben, 36275 Kirchheim',
      Bundesland: 'HE',
      Betrieb: 'DB Netz AG',
      OE: 'I.NA-MI-N-KSL-IL 03',
      Gewerk: 'LST',
      kmArbeitsort: 12,
      nBhf: 'Bad Hersfeld',
      kmnBhf: 8,
      TB: 'Tarifkraft',
    },
    aZ: {
      bBN: '19:30',
      bN: '19:45',
      bS: '20:15',
      bT: '07:00',
      eN: '06:15',
      eS: '07:00',
      eT: '15:45',
      eTF: '13:00',
      rZ: '00:20',
    },
    fZ: [],
    vorgabenB: {},
    Einstellungen: {
      aktivierteTabs: ['bereitschaft'],
      benoetigteZulagen: [],
    },
  };
}

function renderSettingsForm(vorgabenU: IVorgabenU): void {
  document.body.innerHTML = `
    <div id="collapseFive">
      <input type="checkbox" data-tab-key="bereitschaft" checked />
      <input type="checkbox" data-tab-key="ewt" />
      <input type="checkbox" data-tab-key="neben" />
    </div>
    <ul>
      <li><button id="bereitschaft-tab"></button></li>
      <li><button id="ewt-tab"></button></li>
      <li><button id="neben-tab"></button></li>
    </ul>
    <table><tbody id="TbodyTätigkeitsstätten"></tbody></table>
    <table id="tableVE"></table>
  `;

  for (const [key, value] of Object.entries(vorgabenU.pers)) {
    const input = document.createElement('input');
    input.id = key;
    input.value = String(value ?? '');
    document.body.appendChild(input);
  }

  for (const [key, value] of Object.entries(vorgabenU.aZ)) {
    const input = document.createElement('input');
    input.id = key;
    input.required = true;
    input.value = value;
    document.body.appendChild(input);
  }

  const table = document.querySelector<HTMLTableElement>('#tableVE');
  if (!table) throw new Error('tableVE fehlt');
  (table as HTMLTableElement & { instance: { getRows: () => [] } }).instance = {
    getRows: () => [],
  };
}

describe('saveEinstellungen address validation', () => {
  beforeEach(() => {
    localStorage.clear();
    const vorgabenU = createVorgabenU();
    Storage.set('VorgabenU', vorgabenU);
    renderSettingsForm(vorgabenU);
  });

  it('accepts and normalizes addresses in German schema', () => {
    const adress1Input = document.querySelector<HTMLInputElement>('#Adress1');
    const arbeitsortInput = document.querySelector<HTMLInputElement>('#ErsteTkgStAdresse');
    if (!adress1Input || !arbeitsortInput) throw new Error('Adressfelder fehlen');

    adress1Input.value = '  Musterstraße 17 , 12345   Musterstadt  ';
    arbeitsortInput.value = 'Beiersgraben, 36275 Kirchheim';

    const result = saveEinstellungen();

    expect(result.pers.Adress1).toBe('Musterstraße 17, 12345 Musterstadt');
    expect(result.pers.ErsteTkgStAdresse).toBe('Beiersgraben, 36275 Kirchheim');
  });

  it('rejects invalid address formats', () => {
    const adress1Input = document.querySelector<HTMLInputElement>('#Adress1');
    if (!adress1Input) throw new Error('Adress1 fehlt');

    adress1Input.value = 'Musterstraße 17 12345 Musterstadt';

    expect(() => saveEinstellungen()).toThrow('Adressformat ungültig');
  });

  it('accepts a normal phone number format', () => {
    const telefonInput = document.querySelector<HTMLInputElement>('#Telefon');
    if (!telefonInput) throw new Error('Telefon fehlt');

    telefonInput.value = '+49 171 1234567';

    const result = saveEinstellungen();

    expect(result.pers.Telefon).toBe('+49 171 1234567');
  });

  it('allows saving again after correcting an invalid address', () => {
    const adress1Input = document.querySelector<HTMLInputElement>('#Adress1');
    if (!adress1Input) throw new Error('Adress1 fehlt');

    adress1Input.value = 'Musterstraße 17 12345 Musterstadt';
    expect(() => saveEinstellungen()).toThrow('Adressformat ungültig');

    adress1Input.value = 'Musterstraße 17, 12345 Musterstadt';
    adress1Input.dispatchEvent(new Event('input'));

    const result = saveEinstellungen();

    expect(adress1Input.validationMessage).toBe('');
    expect(result.pers.Adress1).toBe('Musterstraße 17, 12345 Musterstadt');
  });

  it('rejects missing Bundesland as invalid personal data', () => {
    const bundeslandInput = document.querySelector<HTMLInputElement>('#Bundesland');
    if (!bundeslandInput) throw new Error('Bundesland fehlt');

    bundeslandInput.value = '';

    expect(() => saveEinstellungen()).toThrow('Persönliche Daten fehlerhaft');
    expect(bundeslandInput.validationMessage).not.toBe('');
    expect(bundeslandInput.classList.contains('is-invalid')).toBe(true);
  });

  it('rejects invalid numeric personal fields like kmArbeitsort', () => {
    const kmArbeitsortInput = document.querySelector<HTMLInputElement>('#kmArbeitsort');
    if (!kmArbeitsortInput) throw new Error('kmArbeitsort fehlt');

    kmArbeitsortInput.value = '0';

    expect(() => saveEinstellungen()).toThrow('Persönliche Daten fehlerhaft');
    expect(kmArbeitsortInput.validationMessage).not.toBe('');
    expect(kmArbeitsortInput.classList.contains('is-invalid')).toBe(true);
  });

  it('accepts an 8-digit Personalnummer with leading zero', () => {
    const pNummerInput = document.querySelector<HTMLInputElement>('#PNummer');
    if (!pNummerInput) throw new Error('PNummer fehlt');

    pNummerInput.value = '01234567';

    const result = saveEinstellungen();

    expect(result.pers.PNummer).toBe('01234567');
  });

  it('rejects Personalnummer when it is not exactly 8 digits', () => {
    const pNummerInput = document.querySelector<HTMLInputElement>('#PNummer');
    if (!pNummerInput) throw new Error('PNummer fehlt');

    pNummerInput.value = '1234567';

    expect(() => saveEinstellungen()).toThrow('Persönliche Daten fehlerhaft');
    expect(pNummerInput.validationMessage).toContain('genau 8-stellig');
    expect(pNummerInput.classList.contains('is-invalid')).toBe(true);
  });

  it('throws when a required aZ field is empty', () => {
    const bBNInput = document.querySelector<HTMLInputElement>('#bBN');
    if (!bBNInput) throw new Error('bBN fehlt');
    bBNInput.value = '';

    expect(() => saveEinstellungen()).toThrow('Persönliche Daten fehlerhaft fehlt');
  });
});

describe('saveEinstellungen – Tabs, Zulagen, AutoSave und fZ', () => {
  beforeEach(() => {
    localStorage.clear();
    const vorgabenU = createVorgabenU();
    Storage.set('VorgabenU', vorgabenU);
    renderSettingsForm(vorgabenU);
  });

  it('sammelt aktivierteTabs aus checkboxes', () => {
    // ewt-Checkbox anklicken
    const ewtCb = document.querySelector<HTMLInputElement>('[data-tab-key="ewt"]')!;
    ewtCb.checked = true;

    const result = saveEinstellungen();

    expect(result.Einstellungen.aktivierteTabs).toContain('bereitschaft');
    expect(result.Einstellungen.aktivierteTabs).toContain('ewt');
    expect(result.Einstellungen.aktivierteTabs).not.toContain('neben');
  });

  it('sammelt benoetigteZulagen wenn #settings-zulagen-list vorhanden', () => {
    const list = document.createElement('div');
    list.id = 'settings-zulagen-list';
    list.innerHTML = `
      <input type="checkbox" data-zulage-code="ZL1" checked />
      <input type="checkbox" data-zulage-code="ZL2" />
    `;
    document.body.appendChild(list);

    const result = saveEinstellungen();

    expect(result.Einstellungen.benoetigteZulagen).toContain('ZL1');
    expect(result.Einstellungen.benoetigteZulagen).not.toContain('ZL2');
  });

  it('liest autoSaveEnabled aus #autoSaveEnabled-Checkbox', () => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'autoSaveEnabled';
    cb.checked = false;
    document.body.appendChild(cb);

    const result = saveEinstellungen();

    expect(result.Einstellungen.autoSaveEnabled).toBe(false);
  });

  it('faellt auf VorgabenU.autoSaveDelayMs zurueck wenn kein Slider vorhanden', () => {
    const vorgabenU = Storage.get<ReturnType<typeof createVorgabenU>>('VorgabenU', { check: true });
    vorgabenU.Einstellungen.autoSaveDelayMs = 30000;
    Storage.set('VorgabenU', vorgabenU);

    const result = saveEinstellungen();

    expect(result.Einstellungen.autoSaveDelayMs).toBe(30000);
  });

  it('liefert leeres fZ-Array wenn keine Taetigkeitsstaetten eingetragen', () => {
    // TODO: happy-dom implementiert HTMLTableSectionElement.rows nicht (Stand @happy-dom/global-registrator ^20.x).
    //       Sobald ein Update das liefert, diesen Test durch drei vollständige Fälle ersetzen:
    //       1. Zeile mit key/text/value → result.fZ enthält Eintrag
    //       2. Zeile mit leerem key → wird übersprungen, result.fZ = []
    //       3. Zeile mit leerem text oder value → wirft 'Beschreibung / Fahrzeit fehlt'
    const result = saveEinstellungen();
    expect(result.fZ).toEqual([]);
  });
});
