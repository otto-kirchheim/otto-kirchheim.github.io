import { beforeEach, describe, expect, it } from 'bun:test';
import { render } from 'preact';
import BerechnungMobileCards, {
  mountBerechnungMobileCards,
} from '@/features/Berechnung/components/BerechnungMobileCards';
import calculateBerechnungRows, { type IBerechnungMonatsErgebnis } from '@/features/Berechnung/calculateBerechnungRows';
import { VorgabenGeldMock, datenBerechungMock } from './mockData';
import type { IVorgabenBerechnung } from '@/types';

const leeresErgebnis = (monat: number): IBerechnungMonatsErgebnis => ({
  monat,
  bereitschaftMinuten: null,
  bereitschaftAnzeige: null,
  bereitschaftszulage: null,
  lre1: null,
  lre2: null,
  lre3: null,
  privatPkw: null,
  summeBereitschaft: null,
  abwesenheiten: null,
  steuerfreieAbwesenheiten: null,
  summeEwt: null,
  summeNebenbezuege: null,
  summeGesamt: null,
});

describe('#BerechnungMobileCards', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="berechnungMobileCards"></div>';
  });

  it('rendert ein Accordion-Item pro Monat mit Summe Gesamt im Header', () => {
    const monatsErgebnisse = calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft');
    mountBerechnungMobileCards(monatsErgebnisse, ['bereitschaft', 'ewt', 'neben']);

    const container = document.querySelector('#berechnungMobileCards')!;
    const items = container.querySelectorAll('.accordion-item');
    expect(items.length).toBe(monatsErgebnisse.length);

    const ersterHeader = items[0].querySelector('.accordion-button')!;
    expect(ersterHeader.textContent).toContain('Jan');
    expect(ersterHeader.textContent).toContain('496,49');

    const ersterBody = items[0].querySelector('.accordion-body')!;
    expect(ersterBody.textContent).toContain('Bereitschaftszulage');
    expect(ersterBody.textContent).toContain('258,00');
    expect(ersterBody.textContent).toContain('Summe EWT');
    expect(ersterBody.textContent).toContain('Summe Nebenbezüge');
    expect(ersterBody.textContent).toContain('Summe Gesamt');
  });

  it('lässt leere Einzelzeilen innerhalb sichtbarer Gruppen weg', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ergebnis = { ...leeresErgebnis(1), summeNebenbezuege: 13.3, summeGesamt: 13.3 };
    render(<BerechnungMobileCards monatsErgebnisse={[ergebnis]} aktivierteTabs={[]} />, container);

    expect(container.textContent).toContain('Summe Nebenbezüge');
    expect(container.textContent).not.toContain('LRE 1');
    expect(container.textContent).not.toContain('Bereitschaftszulage');
  });

  it('blendet deaktivierte Gruppen monatsweise aus, außer der Monat hat Daten', () => {
    const januarMitNeben = { ...leeresErgebnis(1), summeNebenbezuege: 13.3, summeGesamt: 13.3 };
    const februarOhneNeben = leeresErgebnis(2);

    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      <BerechnungMobileCards
        monatsErgebnisse={[januarMitNeben, februarOhneNeben]}
        aktivierteTabs={['bereitschaft', 'ewt']}
      />,
      container,
    );

    const items = container.querySelectorAll('.accordion-item');
    // Januar: neben deaktiviert, aber Daten vorhanden → Block sichtbar
    expect(items[0].querySelector('.accordion-body')!.textContent).toContain('Nebenbezüge');
    // Februar: neben deaktiviert, keine Daten → Block ausgeblendet
    expect(items[1].querySelector('.accordion-body')!.textContent).not.toContain('Nebenbezüge');
  });

  it('wird über generateTableBerechnung mit gerendert (Integration)', async () => {
    const { default: Storage } = await import('@/infrastructure/storage/Storage');
    const { VorgabenUMock } = await import('./mockData');
    const { default: generateTableBerechnung } = await import('@/features/Berechnung/generateTableBerechnung');

    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);
    document.body.innerHTML =
      '<div id="berechnungMobileCards"></div><table><tbody id="tbodyBerechnung"></tbody></table>';

    generateTableBerechnung(datenBerechungMock as IVorgabenBerechnung, VorgabenGeldMock);

    const items = document.querySelectorAll('#berechnungMobileCards .accordion-item');
    expect(items.length).toBe(Object.keys(datenBerechungMock).length);
  });
});
