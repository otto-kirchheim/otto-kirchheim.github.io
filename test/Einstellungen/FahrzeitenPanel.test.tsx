import { afterEach, describe, expect, it } from 'bun:test';
import { render } from 'preact';
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
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

function rowKeys(container: HTMLDivElement): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('tbody input[type="text"][aria-label="Tätigkeitsstätte"]')).map(
    input => input.value,
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
    const keyInput = container.querySelector<HTMLInputElement>('tbody input[aria-label="Tätigkeitsstätte"]')!;

    await fireInput(keyInput, 'Fulda');

    expect(getFahrzeitPanelState()).toEqual([{ key: 'Fulda', text: '', value: '' }]);
    expect(keyInput.classList.contains('is-invalid')).toBe(false);
    const textInput = container.querySelector<HTMLInputElement>('tbody input[aria-label="Beschreibung"]')!;
    const valueInput = container.querySelector<HTMLInputElement>('tbody input[aria-label="Fahrzeit"]')!;
    // Beschreibung ist optional und wird nie als ungültig markiert
    expect(textInput.classList.contains('is-invalid')).toBe(false);
    expect(valueInput.classList.contains('is-invalid')).toBe(true);
  });

  it('markiert eine komplett leere Zeile nicht als ungültig', () => {
    const container = renderPanel([{ key: '', text: '', value: '' }]);

    expect(container.querySelector('tbody .is-invalid')).toBeNull();
  });
});
