import './setupBun';
import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IVorgabenU, IVorgabenUvorgabenB } from '@/core/types';
import applyBereitschaftsVorgabe from '@/features/Bereitschaft/utils/applyBereitschaftsVorgabe';
import toggleBereitschaftsEigeneWerte from '@/features/Bereitschaft/utils/toggleBereitschaftsEigeneWerte';
import updateBereitschaftsDatum from '@/features/Bereitschaft/utils/updateBereitschaftsDatum';
import Storage from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';

function createVorgabenB(): IVorgabenUvorgabenB {
  return {
    Name: 'Test',
    beginnB: { tag: 1 },
    endeB: { tag: 3, Nwoche: true },
    nacht: false,
    beginnN: { tag: 4, Nwoche: false },
    endeN: { tag: 5, Nwoche: true },
  };
}

// Zeiten werden aus aZ je Wochentag abgeleitet (frueh/spaet/nacht).
function createVorgabenU(): IVorgabenU {
  return {
    aZ: {
      frueh: {
        aktiv: true,
        default: { beginn: '07:00', ende: '15:45', pause: 30 },
        overrides: { 5: { ende: '13:00', pause: 0 } },
      },
      spaet: { aktiv: false, default: { beginn: '13:45', ende: '22:00', pause: 30 } },
      nacht: { aktiv: true, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
      sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
      fahrzeit: '00:20',
    },
  } as unknown as IVorgabenU;
}

describe('Bereitschaft utils extra', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    localStorage.clear();
    Storage.set('VorgabenU', createVorgabenU());
  });

  it('datumAnpassen setzt alle Datums- und Zeitfelder', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="sonder" type="checkbox" checked />
        <input id="sonderVon" />
        <input id="sonderBis" />
        <input id="bE" />
        <input id="bET" />
        <input id="nA" />
        <input id="nAT" />
        <input id="nE" />
        <input id="nET" />
      </div>
    `;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    const vorgabenB = createVorgabenB();
    const datum = dayjs('2026-03-02');
    const expectedBE = datum
      .isoWeekday(vorgabenB.endeB.tag)
      .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
    // Nacht aus aZ.nacht: Anfang = datum (00:00), Ende = +1 Tag (über Mitternacht).
    const expectedNA = datum.format('YYYY-MM-DD');
    const expectedNE = datum.add(1, 'day').format('YYYY-MM-DD');

    updateBereitschaftsDatum(parentElement, vorgabenB, datum);

    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.value).toBe(expectedBE);
    // bET = frueh.Beginn des End-Wochentags (Mi → 07:00)
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.value).toBe('07:00');
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.value).toBe(expectedNA);
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.value).toBe('19:45');
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.value).toBe(expectedNE);
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.value).toBe('06:15');
  });

  it('datumAnpassen ignoriert Sonderschicht als globale Grenzlogik', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="bA" />
        <input id="bAT" />
        <input id="nacht" type="checkbox" />
        <input id="sonder" type="checkbox" checked />
        <input id="sonderVon" value="2026-03-03" />
        <input id="sonderBis" value="2026-03-03" />
        <input id="bE" />
        <input id="bET" />
        <input id="nA" />
        <input id="nAT" />
        <input id="nE" />
        <input id="nET" />
      </div>
    `;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    Storage.set('VorgabenU', {
      ...createVorgabenU(),
      aZ: {
        ...createVorgabenU().aZ,
        sonder: { aktiv: true, beginn: '20:15', ende: '07:00', pause: 20 },
      },
    });

    const vorgabenB = createVorgabenB();
    const datum = dayjs('2026-03-02');

    updateBereitschaftsDatum(parentElement, vorgabenB, datum);

    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.value).toBe('07:00');
  });

  it('datumAnpassen wirft Fehler bei fehlenden Inputs', () => {
    document.body.innerHTML = `<div id="root"><input id="bE" /></div>`;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => updateBereitschaftsDatum(parentElement, createVorgabenB(), dayjs('2026-03-02'))).toThrow(
      'Element not found',
    );
  });

  it('eigeneWerte aktiviert Felder, wenn eigen gesetzt ist', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="bA" />
        <input id="bAT" />
        <input id="nacht" type="checkbox" />
        <input id="bE" />
        <input id="bET" />
        <input id="nA" />
        <input id="nAT" />
        <input id="nE" />
        <input id="nET" />
        <input id="eigen" type="checkbox" checked />
      </div>
    `;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    toggleBereitschaftsEigeneWerte(parentElement, createVorgabenB(), dayjs('2026-03-02'));

    // Nur die Datumsfelder werden entsperrt (Zeiten sind generell read-only).
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.disabled).toBe(false);
  });

  it('eigeneWerte deaktiviert Felder, wenn eigen nicht gesetzt ist', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="bA" />
        <input id="bAT" />
        <input id="nacht" type="checkbox" />
        <input id="bE" />
        <input id="bET" />
        <input id="nA" />
        <input id="nAT" />
        <input id="nE" />
        <input id="nET" />
        <input id="eigen" type="checkbox" />
      </div>
    `;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');
    const vorgabenB = createVorgabenB();
    const datum = dayjs('2026-03-02');

    toggleBereitschaftsEigeneWerte(parentElement, vorgabenB, datum);

    // Nur die Datumsfelder werden gesperrt; Zeiten bleiben unangetastet (read-only Text).
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.disabled).toBe(true);
  });

  it('eigeneWerte wirft Fehler bei fehlenden Inputs', () => {
    document.body.innerHTML = `<div id="root"><input id="bAT" /></div>`;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => toggleBereitschaftsEigeneWerte(parentElement, createVorgabenB(), dayjs('2026-03-02'))).toThrow(
      'Input Element nicht gefunden',
    );
  });

  it('BerVorgabeAEndern setzt alle Felder inkl. Nachtschicht sichtbar', () => {
    document.body.innerHTML = `
      <div id="root">
        <input id="bA" />
        <input id="bAT" />
        <input id="bE" />
        <input id="bET" />
        <input id="nacht" type="checkbox" />
        <input id="nA" />
        <input id="nAT" />
        <input id="nE" />
        <input id="nET" />
        <div id="nachtschicht"></div>
      </div>
    `;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');
    const vorgabenB = { ...createVorgabenB(), nacht: true };
    const datum = dayjs('2026-03-02');

    applyBereitschaftsVorgabe(parentElement, vorgabenB, datum);

    expect(parentElement.querySelector<HTMLInputElement>('#bA')?.value).toBe(
      datum.isoWeekday(vorgabenB.beginnB.tag).format('YYYY-MM-DD'),
    );
    // bAT = frueh.Ende des Anfangs-Wochentags (Mo → 15:45)
    expect(parentElement.querySelector<HTMLInputElement>('#bAT')?.value).toBe('15:45');
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.value).toBe(
      datum
        .isoWeekday(vorgabenB.endeB.tag)
        .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
        .format('YYYY-MM-DD'),
    );
    // bET = frueh.Beginn des End-Wochentags (Mi → 07:00)
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.value).toBe('07:00');
    expect(parentElement.querySelector<HTMLInputElement>('#nacht')?.checked).toBe(true);
    // Nacht aus aZ.nacht: Anfang = datum (00:00), Ende = +1 Tag.
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.value).toBe(datum.format('YYYY-MM-DD'));
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.value).toBe('19:45');
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.value).toBe(datum.add(1, 'day').format('YYYY-MM-DD'));
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.value).toBe('06:15');
    expect(parentElement.querySelector<HTMLDivElement>('#nachtschicht')?.style.display).not.toBe('none');
  });

  it('BerVorgabeAEndern wirft Fehler bei fehlendem Datum', () => {
    document.body.innerHTML = `<div id="root"></div>`;
    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => applyBereitschaftsVorgabe(parentElement, createVorgabenB(), null as never)).toThrow(
      'Datum nicht gefunden',
    );
  });

  it('BerVorgabeAEndern wirft Fehler bei fehlenden Inputs', () => {
    document.body.innerHTML = `<div id="root"><input id="bA" /></div>`;
    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => applyBereitschaftsVorgabe(parentElement, createVorgabenB(), dayjs('2026-03-02'))).toThrow(
      'Input Element nicht gefunden',
    );
  });
});
