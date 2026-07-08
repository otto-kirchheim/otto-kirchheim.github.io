import { beforeAll, describe, expect, it } from 'bun:test';
import { VorgabenGeldMock, VorgabenUMock, datenBerechungMock } from './mockData';
import Storage from '@/infrastructure/storage/Storage';
import generateTableBerechnung from '@/features/Berechnung/generateTableBerechnung';
import { ermittleFensterGroesse, initBerechnungMonatsFensterNav } from '@/features/Berechnung/berechnungMonatsFenster';
import type { IVorgabenBerechnung, IVorgabenGeld } from '@/types';

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

describe('#berechnungMonatsFenster', () => {
  let groesse: number;

  beforeAll(() => {
    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);
    Storage.set('Monat', 1); // Fenster startet bei Jan

    document.body.innerHTML =
      '<div id="berechnungMonatsNav" class="d-none d-sm-flex d-xl-none"></div>' +
      '<button id="btnBerechnungMonatePrev"></button>' +
      '<span id="berechnungMonatsFensterLabel"></span>' +
      '<button id="btnBerechnungMonateNext"></button>' +
      '<div id="berechnungMobileCards"></div>' +
      '<table class="table-Berechnung"><thead><tr><th></th>' +
      Array.from({ length: 12 }, (_, i) => `<th data-monat="${i + 1}">M${i + 1}</th>`).join('') +
      '</tr></thead><tbody id="tbodyBerechnung"></tbody></table>';

    initBerechnungMonatsFensterNav();
    generateTableBerechnung(
      datenBerechungMock as IVorgabenBerechnung,
      Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
    );

    groesse = ermittleFensterGroesse();
  });

  const kopfzelle = (monat: number) => document.querySelector<HTMLElement>(`thead [data-monat="${monat}"]`)!;

  it('berechnet eine dynamische Fenstergröße zwischen 1 und 12', () => {
    expect(groesse).toBeGreaterThanOrEqual(1);
    expect(groesse).toBeLessThanOrEqual(12);
  });

  it('blendet Monate außerhalb des Fensters aus (d-none d-xl-table-cell)', () => {
    expect(kopfzelle(1).classList.contains('d-none')).toBe(false);
    expect(kopfzelle(groesse).classList.contains('d-none')).toBe(false);

    if (groesse < 12) {
      expect(kopfzelle(groesse + 1).classList.contains('d-none')).toBe(true);
      expect(kopfzelle(groesse + 1).classList.contains('d-xl-table-cell')).toBe(true);

      const tdVersteckt = document.querySelector<HTMLElement>(`#tbodyBerechnung td[data-monat="${groesse + 1}"]`);
      expect(tdVersteckt?.classList.contains('d-none')).toBe(true);
    }

    expect(document.querySelector('#berechnungMonatsFensterLabel')?.textContent).toBe(
      `Jan – ${MONATSNAMEN[groesse - 1]}`,
    );
    expect(document.querySelector<HTMLButtonElement>('#btnBerechnungMonatePrev')?.disabled).toBe(true);
  });

  it('verschiebt das Fenster über den Next-Button um einen Monat', () => {
    if (groesse >= 12) return; // nichts zu verschieben

    document.querySelector<HTMLButtonElement>('#btnBerechnungMonateNext')?.click();

    expect(kopfzelle(1).classList.contains('d-none')).toBe(true);
    expect(kopfzelle(groesse + 1).classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#berechnungMonatsFensterLabel')?.textContent).toBe(`Feb – ${MONATSNAMEN[groesse]}`);
    expect(document.querySelector<HTMLButtonElement>('#btnBerechnungMonatePrev')?.disabled).toBe(false);
  });

  it('stoppt am Jahresende (Dez sichtbar, Next disabled)', () => {
    const next = document.querySelector<HTMLButtonElement>('#btnBerechnungMonateNext')!;
    for (let i = 0; i < 15; i++) next.click();

    expect(next.disabled).toBe(true);
    expect(kopfzelle(12).classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#berechnungMonatsFensterLabel')?.textContent).toBe(
      `${MONATSNAMEN[12 - groesse]} – Dez`,
    );
  });

  it('blendet die Navigation aus, wenn alle 12 Monate sichtbar sind', () => {
    const nav = document.querySelector<HTMLElement>('#berechnungMonatsNav');
    expect(nav).not.toBeNull();

    if (groesse >= 12) {
      expect(nav?.style.getPropertyValue('display')).toBe('none');
      expect(nav?.style.getPropertyPriority('display')).toBe('important');
      return;
    }

    expect(nav?.style.getPropertyValue('display')).toBe('');
  });
});
