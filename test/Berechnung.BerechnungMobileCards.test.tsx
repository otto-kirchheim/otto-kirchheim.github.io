import { beforeEach, describe, expect, it } from 'bun:test';
import { render } from '@test/reactRender';

import BerechnungMobileCards from '@/features/Berechnung/components/BerechnungMobileCards';
import { mountBerechnungMobileCards } from '@/features/Berechnung/components/mountBerechnung';
import calculateBerechnungRows, { type IBerechnungMonatsErgebnis } from '@/features/Berechnung/calculateBerechnungRows';
import { ZulageEntryUnit } from '@/features/Einstellungen/utils/zulagenCatalog';
import { VorgabenGeldMock, datenBerechungMock } from '@test/mockData';
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
  eaMinuten: null,
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
    const items = container.querySelectorAll('.db-accordion-item');
    expect(items.length).toBe(monatsErgebnisse.length);

    const ersterHeader = items[0].querySelector('summary')!;
    expect(ersterHeader.textContent).toContain('Jan');
    expect(ersterHeader.textContent).toContain('496,49');

    const ersterBody = items[0].querySelector('summary + div')!;
    expect(ersterBody.textContent).toContain('Bereitschaftszulage');
    expect(ersterBody.textContent).toContain('258,00');
    // Gruppensummen stehen in den Zwischenüberschriften
    expect(ersterBody.textContent).toContain('EWT');
    expect(ersterBody.textContent).toContain('77,20');
    expect(ersterBody.textContent).toContain('Nebenbezüge');
    expect(ersterBody.textContent).toContain('13,30');
    expect(ersterBody.textContent).toContain('Gesamt');
  });

  it('lässt leere Einzelzeilen innerhalb sichtbarer Gruppen weg', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ergebnis = { ...leeresErgebnis(1), summeNebenbezuege: 13.3, summeGesamt: 13.3 };
    render(<BerechnungMobileCards monatsErgebnisse={[ergebnis]} aktivierteTabs={[]} />, container);

    expect(container.textContent).toContain('Nebenbezüge');
    expect(container.textContent).toContain('13,30');
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

    const items = container.querySelectorAll('.db-accordion-item');
    // Januar: neben deaktiviert, aber Daten vorhanden → Block sichtbar
    expect(items[0].querySelector('summary + div')!.textContent).toContain('Nebenbezüge');
    // Februar: neben deaktiviert, keine Daten → Block ausgeblendet
    expect(items[1].querySelector('summary + div')!.textContent).not.toContain('Nebenbezüge');
  });

  it('zeigt Zulagen des Monats auch bei nur einem Code im Jahr, lässt 0-Zeilen weg', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const ergebnis = { ...leeresErgebnis(1), summeNebenbezuege: 19.95, summeGesamt: 19.95 };
    const zulagenBreakdown = {
      codes: [{ code: '040', label: '040 Fahrentsch.', unit: ZulageEntryUnit.Stueck }],
      values: { '040': [3, ...Array.from({ length: 11 }, () => 0)] },
    };

    render(
      <BerechnungMobileCards
        monatsErgebnisse={[ergebnis, { ...leeresErgebnis(2), summeGesamt: 0 }]}
        aktivierteTabs={[]}
        zulagenBreakdown={zulagenBreakdown}
      />,
      container,
    );

    const items = container.querySelectorAll('.db-accordion-item');
    // Januar: Code mit Wert 3 → Zeile sichtbar (auch bei nur einem Code im Jahr)
    expect(items[0].textContent).toContain('040 Fahrentsch.');
    expect(items[0].textContent).toContain('3 Stk.');
    // Februar: Wert 0 → keine Zulagen-Zeile
    expect(items[1].textContent).not.toContain('040 Fahrentsch.');
  });

  it('rendert EWT-Schwellen als eigene Zeilen und lässt Nullwerte weg', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const ergebnis = {
      ...leeresErgebnis(1),
      abwesenheiten: { a8: 9, a14: 0, a24: 0 },
      steuerfreieAbwesenheiten: { s8: 2, s14: 0 },
      summeEwt: 36.81,
      summeGesamt: 36.81,
    };

    render(<BerechnungMobileCards monatsErgebnisse={[ergebnis]} aktivierteTabs={[]} />, container);

    expect(container.textContent).toContain('Abwesenheiten >8 Std.');
    expect(container.textContent).not.toContain('>14 Std.');
    expect(container.textContent).not.toContain('>24 Std.');
    expect(container.textContent).toContain('steuerfrei >8 Std.');
  });

  it('klappt den aktuellen Monat standardmäßig auf', async () => {
    const { default: Storage } = await import('@/infrastructure/storage/Storage');
    Storage.set('Monat', 2);

    const monatsErgebnisse = [leeresErgebnis(1), leeresErgebnis(2), leeresErgebnis(3)];
    mountBerechnungMobileCards(monatsErgebnisse, []);

    const container = document.querySelector('#berechnungMobileCards')!;
    // `DBAccordionItem` uebernimmt `open` erst per Effekt -- einen Tick abwarten.
    await new Promise(r => setTimeout(r, 30));
    // `DBAccordionItem` traegt die Id am `<li>`, das native `<details>` liegt darin.
    expect(container.querySelector<HTMLDetailsElement>('#berechnungMonatCollapse2 > details')?.open).toBe(true);
    expect(container.querySelector<HTMLDetailsElement>('#berechnungMonatCollapse1 > details')?.open).toBe(false);
  });

  it('klappt per Klick genau eine Monatskarte auf und die vorherige zu', async () => {
    const { default: Storage } = await import('@/infrastructure/storage/Storage');
    Storage.set('Monat', 2);
    mountBerechnungMobileCards([leeresErgebnis(1), leeresErgebnis(2), leeresErgebnis(3)], []);
    const container = document.querySelector('#berechnungMobileCards')!;
    await new Promise(r => setTimeout(r, 30));

    const offen = () =>
      Array.from(container.querySelectorAll<HTMLDetailsElement>('.db-accordion-item > details'))
        .map((d, i) => (d.open ? i + 1 : 0))
        .filter(Boolean);
    expect(offen()).toEqual([2]);

    container.querySelector<HTMLElement>('#berechnungMonatCollapse3 summary')?.click();
    await new Promise(r => setTimeout(r, 30));
    expect(offen()).toEqual([3]);

    // Erneuter Klick auf den zuvor geschlossenen Eintrag oeffnet ihn sofort wieder (ein Klick).
    container.querySelector<HTMLElement>('#berechnungMonatCollapse2 summary')?.click();
    await new Promise(r => setTimeout(r, 30));
    expect(offen()).toEqual([2]);
  });

  it('wird über generateTableBerechnung mit gerendert (Integration)', async () => {
    const { default: Storage } = await import('@/infrastructure/storage/Storage');
    const { VorgabenUMock } = await import('@test/mockData');
    const { default: generateTableBerechnung } = await import('@/features/Berechnung/generateTableBerechnung');

    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);
    document.body.innerHTML =
      '<div id="berechnungMobileCards"></div><table><tbody id="tbodyBerechnung"></tbody></table>';

    generateTableBerechnung(datenBerechungMock as IVorgabenBerechnung, VorgabenGeldMock);

    const items = document.querySelectorAll('#berechnungMobileCards .db-accordion-item');
    expect(items.length).toBe(Object.keys(datenBerechungMock).length);
  });
});
