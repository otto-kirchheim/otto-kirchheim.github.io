import { afterEach, describe, expect, it } from 'bun:test';
import { feldMitBeschriftung, render, setzeWert } from '../reactRender';

import { FahrzeitenPanel } from '@/features/Einstellungen/components/FahrzeitenPanel';
import { getFahrzeitPanelState, setFahrzeitPanelState } from '@/features/Einstellungen/components/fahrzeitPanelState';
import type { IVorgabenUfZ } from '@/core/types';

function createRows(): IVorgabenUfZ[] {
  return [
    { key: 'Kaiserau', text: 'km 167,0', value: '00:10' },
    { key: 'Kirchheim', text: 'Beiersgraben', value: '00:20' },
    { key: 'Bad Hersfeld', text: 'Bahnhof', value: '00:30' },
  ];
}

function renderPanel(initialRows: IVorgabenUfZ[]): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<FahrzeitenPanel initialRows={initialRows} />, container);
  return container;
}

// Preact batches setState-triggered re-renders on a microtask; flush it before asserting on the DOM.
async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function click(button: HTMLButtonElement): Promise<void> {
  button.dispatchEvent(new Event('click', { bubbles: true }));
  await flush();
}

async function fireInput(el: HTMLInputElement, value: string): Promise<void> {
  setzeWert(el, value);
  await flush();
}

/** Feld einer Zelle ueber die Beschriftung in der `db-input`-Huelle finden. */
function feld(bereich: ParentNode, beschriftung: string): HTMLInputElement {
  const huelle = Array.from(bereich.querySelectorAll('tbody .db-input')).find(
    el => el.querySelector('label')?.textContent === beschriftung,
  );
  const input = huelle?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error(`Feld ${beschriftung} nicht gefunden`);
  return input;
}

function rowKeys(container: HTMLDivElement): string[] {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr')).map(
    zeile => zeile.querySelector<HTMLInputElement>('td .db-input input')?.value ?? '',
  );
}

afterEach(() => {
  document.body.innerHTML = '';
  setFahrzeitPanelState(null);
});

describe('FahrzeitenPanel', () => {
  it('rendert Bestandszeilen ohne fixe Leerzeilen und publiziert den Initial-State in die Bridge', async () => {
    const container = renderPanel(createRows());

    expect(container.querySelectorAll('tbody tr').length).toBe(3);
    expect(rowKeys(container)).toEqual(['Kaiserau', 'Kirchheim', 'Bad Hersfeld']);

    // Der Mount-Effect publiziert die Initial-Zeilen asynchron in die Bridge.
    await flush();
    expect(getFahrzeitPanelState()).toEqual(createRows());
  });

  it('normalisiert Legacy-Fahrzeiten ("0:30") beim Laden auf HH:mm', async () => {
    const container = renderPanel([{ key: 'Kaiserau', text: '', value: '0:30' }]);

    const timeInput = container.querySelector<HTMLInputElement>('tbody input[type="time"]')!;
    expect(timeInput.value).toBe('00:30');

    // Auch die Bridge (Speicherpfad) erhält den normalisierten Wert.
    await flush();
    expect(getFahrzeitPanelState()).toEqual([{ key: 'Kaiserau', text: '', value: '00:30' }]);
  });

  it('zeigt einen Empty-State bei leerer Liste', () => {
    const container = renderPanel([]);

    expect(container.querySelector('tbody')?.textContent).toContain('Keine Fahrzeiten hinterlegt.');
    expect(container.querySelector('button[aria-label="Zeile löschen"]')).toBeNull();
  });

  it('fügt über den Button eine neue Leerzeile hinzu', async () => {
    const container = renderPanel(createRows());
    const addButton = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Zeile hinzufügen'),
    )!;

    await click(addButton);

    expect(container.querySelectorAll('tbody tr').length).toBe(4);
    expect(getFahrzeitPanelState()).toEqual([...createRows(), { key: '', text: '', value: '' }]);
  });

  it('löscht eine einzelne Zeile', async () => {
    const container = renderPanel(createRows());
    const deleteButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Zeile löschen"]');

    await click(deleteButtons[1]);

    expect(rowKeys(container)).toEqual(['Kaiserau', 'Bad Hersfeld']);
    expect(getFahrzeitPanelState()?.map(r => r.key)).toEqual(['Kaiserau', 'Bad Hersfeld']);
  });

  it('verschiebt Zeilen nach oben und unten, Randpositionen sind deaktiviert', async () => {
    const container = renderPanel(createRows());
    const upButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Nach oben verschieben"]');
    const downButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Nach unten verschieben"]');

    expect(upButtons[0].disabled).toBe(true);
    expect(downButtons[2].disabled).toBe(true);

    await click(upButtons[1]);
    expect(rowKeys(container)).toEqual(['Kirchheim', 'Kaiserau', 'Bad Hersfeld']);

    const downButtonsAfter = container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Nach unten verschieben"]',
    );
    await click(downButtonsAfter[1]);
    expect(rowKeys(container)).toEqual(['Kirchheim', 'Bad Hersfeld', 'Kaiserau']);
    expect(getFahrzeitPanelState()?.map(r => r.key)).toEqual(['Kirchheim', 'Bad Hersfeld', 'Kaiserau']);
  });

  it('synchronisiert Eingaben sofort in die Bridge und markiert leere Pflichtfelder als ungültig', async () => {
    const container = renderPanel([{ key: '', text: '', value: '' }]);
    const keyInput = feld(container, 'Tätigkeitsstätte');

    await fireInput(keyInput, 'Fulda');

    expect(getFahrzeitPanelState()).toEqual([{ key: 'Fulda', text: '', value: '' }]);
    expect(keyInput.hasAttribute('data-custom-validity')).toBe(false);
    const textInput = feld(container, 'Beschreibung');
    const valueInput = feld(container, 'Fahrzeit');
    // Beschreibung ist optional und wird nie als ungültig markiert
    expect(textInput.hasAttribute('data-custom-validity')).toBe(false);
    expect(valueInput.getAttribute('data-custom-validity')).toBe('invalid');
  });

  it('markiert eine komplett leere Zeile nicht als ungültig', () => {
    const container = renderPanel([{ key: '', text: '', value: '' }]);

    expect(container.querySelector('tbody [data-custom-validity="invalid"]')).toBeNull();
  });

  it('sortiert per Klick auf die Spaltenkoepfe (Tätigkeitsstätte/Beschreibung), erneuter Klick dreht um', async () => {
    const container = renderPanel(createRows());
    const sortTaetigkeitsstaette = Array.from(container.querySelectorAll<HTMLButtonElement>('thead button')).find(b =>
      b.textContent?.includes('Tätigkeitsstätte'),
    )!;
    const sortBeschreibung = Array.from(container.querySelectorAll<HTMLButtonElement>('thead button')).find(b =>
      b.textContent?.includes('Beschreibung'),
    )!;

    await click(sortTaetigkeitsstaette);
    expect(rowKeys(container)).toEqual(['Bad Hersfeld', 'Kaiserau', 'Kirchheim']);
    expect(getFahrzeitPanelState()?.map(r => r.key)).toEqual(['Bad Hersfeld', 'Kaiserau', 'Kirchheim']);

    await click(sortTaetigkeitsstaette);
    expect(rowKeys(container)).toEqual(['Kirchheim', 'Kaiserau', 'Bad Hersfeld']);

    await click(sortBeschreibung);
    // Beschreibung aufsteigend: "Bahnhof" < "Beiersgraben" < "km 167,0"
    expect(rowKeys(container)).toEqual(['Bad Hersfeld', 'Kirchheim', 'Kaiserau']);
  });

  it('sortiert über die Sortier-Leiste (Auswahl + Knopf) für das Karten-Layout, Richtung kippt bei Wiederholung', async () => {
    const container = renderPanel(createRows());
    const auswahl = feldMitBeschriftung<HTMLSelectElement>(container, 'Sortieren nach')!;
    expect(auswahl).not.toBeNull();
    const sortierKnopf = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.fahrzeiten-sortierung button'),
    ).find(b => b.textContent?.includes('Sortieren'))!;

    // Auswahl steht initial auf "Tätigkeitsstätte": Knopfdruck sortiert aufsteigend nach key
    await click(sortierKnopf);
    expect(rowKeys(container)).toEqual(['Bad Hersfeld', 'Kaiserau', 'Kirchheim']);

    // Auswahl auf "Beschreibung" umstellen -- React haengt onChange am nativen change-Event
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(auswahl, 'text');
    auswahl.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    await click(sortierKnopf);
    // Beschreibung aufsteigend: "Bahnhof" < "Beiersgraben" < "km 167,0"
    expect(rowKeys(container)).toEqual(['Bad Hersfeld', 'Kirchheim', 'Kaiserau']);

    // Erneutes Antippen desselben Kriteriums dreht die Richtung um
    await click(sortierKnopf);
    expect(rowKeys(container)).toEqual(['Kaiserau', 'Kirchheim', 'Bad Hersfeld']);
    expect(getFahrzeitPanelState()?.map(r => r.key)).toEqual(['Kaiserau', 'Kirchheim', 'Bad Hersfeld']);
  });
});
