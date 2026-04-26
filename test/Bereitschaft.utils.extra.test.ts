import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

const { berVorgabeAEndernMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  berVorgabeAEndernMock: vi.fn(),
}));

import type { IVorgabenUvorgabenB } from '@/core/types';
import applyBereitschaftsVorgabe from '@/features/Bereitschaft/utils/applyBereitschaftsVorgabe';
import updateBereitschaftsDatum from '@/features/Bereitschaft/utils/updateBereitschaftsDatum';
import dayjs from '@/infrastructure/date/configDayjs';

type ToggleBereitschaftsEigeneWerte = (
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
) => void;

async function loadEigeneWerte(): Promise<ToggleBereitschaftsEigeneWerte> {
  mock.module('@/features/Bereitschaft/utils', () => ({
    applyBereitschaftsVorgabe: berVorgabeAEndernMock,
  }));

  const module = await import('@/features/Bereitschaft/utils/toggleBereitschaftsEigeneWerte');
  return module.default;
}

function createVorgabenB(): IVorgabenUvorgabenB {
  return {
    Name: 'Test',
    beginnB: { tag: 1, zeit: '07:00' },
    endeB: { tag: 3, zeit: '15:00', Nwoche: true },
    nacht: false,
    beginnN: { tag: 4, zeit: '20:00', Nwoche: false },
    endeN: { tag: 5, zeit: '06:00', Nwoche: true },
  };
}

describe('Bereitschaft utils extra', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mock.restore();
    vi.clearAllMocks();
  });

  it('datumAnpassen setzt alle Datums- und Zeitfelder', () => {
    document.body.innerHTML = `
      <div id="root">
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
    const expectedNA = datum
      .isoWeekday(vorgabenB.beginnN.tag)
      .add(vorgabenB.beginnN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
    const expectedNE = datum
      .isoWeekday(vorgabenB.endeN.tag)
      .add(vorgabenB.endeN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');

    updateBereitschaftsDatum(parentElement, vorgabenB, datum);

    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.value).toBe(expectedBE);
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.value).toBe('15:00');
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.value).toBe(expectedNA);
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.value).toBe('20:00');
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.value).toBe(expectedNE);
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.value).toBe('06:00');
  });

  it('datumAnpassen wirft Fehler bei fehlenden Inputs', () => {
    document.body.innerHTML = `<div id="root"><input id="bE" /></div>`;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => updateBereitschaftsDatum(parentElement, createVorgabenB(), dayjs('2026-03-02'))).toThrow(
      'Element not found',
    );
  });

  it('eigeneWerte aktiviert Felder und ruft BerVorgabeAEndern nicht auf, wenn eigen gesetzt ist', async () => {
    const eigeneWerte = await loadEigeneWerte();

    document.body.innerHTML = `
      <div id="root">
        <input id="bAT" />
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

    eigeneWerte(parentElement, createVorgabenB(), dayjs('2026-03-02'));

    expect(parentElement.querySelector<HTMLInputElement>('#bAT')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.disabled).toBe(false);
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.disabled).toBe(false);
    expect(berVorgabeAEndernMock).not.toHaveBeenCalled();
  });

  it('eigeneWerte deaktiviert Felder und ruft BerVorgabeAEndern auf, wenn eigen nicht gesetzt ist', async () => {
    const eigeneWerte = await loadEigeneWerte();

    document.body.innerHTML = `
      <div id="root">
        <input id="bAT" />
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

    eigeneWerte(parentElement, vorgabenB, datum);

    expect(parentElement.querySelector<HTMLInputElement>('#bAT')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.disabled).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.disabled).toBe(true);
    expect(berVorgabeAEndernMock).toHaveBeenCalledWith(parentElement, vorgabenB, datum);
  });

  it('eigeneWerte wirft Fehler bei fehlenden Inputs', async () => {
    const eigeneWerte = await loadEigeneWerte();

    document.body.innerHTML = `<div id="root"><input id="bAT" /></div>`;

    const parentElement = document.querySelector<HTMLDivElement>('#root');
    if (!parentElement) throw new Error('root not found');

    expect(() => eigeneWerte(parentElement, createVorgabenB(), dayjs('2026-03-02'))).toThrow(
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
    expect(parentElement.querySelector<HTMLInputElement>('#bAT')?.value).toBe(vorgabenB.beginnB.zeit);
    expect(parentElement.querySelector<HTMLInputElement>('#bE')?.value).toBe(
      datum
        .isoWeekday(vorgabenB.endeB.tag)
        .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
        .format('YYYY-MM-DD'),
    );
    expect(parentElement.querySelector<HTMLInputElement>('#bET')?.value).toBe(vorgabenB.endeB.zeit);
    expect(parentElement.querySelector<HTMLInputElement>('#nacht')?.checked).toBe(true);
    expect(parentElement.querySelector<HTMLInputElement>('#nA')?.value).toBe(
      datum
        .isoWeekday(vorgabenB.beginnN.tag)
        .add(vorgabenB.beginnN.Nwoche ? 7 : 0, 'd')
        .format('YYYY-MM-DD'),
    );
    expect(parentElement.querySelector<HTMLInputElement>('#nAT')?.value).toBe(vorgabenB.beginnN.zeit);
    expect(parentElement.querySelector<HTMLInputElement>('#nE')?.value).toBe(
      datum
        .isoWeekday(vorgabenB.endeN.tag)
        .add(vorgabenB.endeN.Nwoche ? 7 : 0, 'd')
        .format('YYYY-MM-DD'),
    );
    expect(parentElement.querySelector<HTMLInputElement>('#nET')?.value).toBe(vorgabenB.endeN.zeit);
    expect(parentElement.querySelector<HTMLDivElement>('#nachtschicht')?.style.display).toBe('flex');
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
