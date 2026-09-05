import { describe, expect, it } from 'bun:test';
import { useState } from 'react';
import { render, setzeWert } from '../reactRender';

import { OeLevelBoxes } from '@/features/Admin/components/OeLevelBoxes';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function renderBoxes(value: string, onChange: (value: string) => void, disabled = false): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<OeLevelBoxes value={value} onChange={onChange} disabled={disabled} />, container);
  return container;
}

function boxes(container: HTMLDivElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]'));
}

function setValue(input: HTMLInputElement, value: string): void {
  setzeWert(input, value);
}

describe('OeLevelBoxes', () => {
  it('zerlegt den Wert in eine Box je Ebene', () => {
    const container = renderBoxes('V.IW-MI', () => {});

    const values = boxes(container).map(input => input.value);
    expect(values).toEqual(['V', 'IW', 'MI']);
  });

  it('zeigt bei leerem Wert eine einzelne leere Box', () => {
    const container = renderBoxes('', () => {});

    expect(boxes(container)).toHaveLength(1);
    expect(boxes(container)[0].value).toBe('');
  });

  it('liefert den neu zusammengesetzten String bei Änderung einer Ebene', () => {
    let lastValue: string | undefined;
    const container = renderBoxes('V.IW-MI', value => {
      lastValue = value;
    });

    setValue(boxes(container)[1], 'NEU');

    expect(lastValue).toBe('V.NEU-MI');
  });

  it('fügt über den Hinzufügen-Button eine neue leere Box hinzu', async () => {
    const container = renderBoxes('V.IW', () => {});
    expect(boxes(container)).toHaveLength(2);

    const addButton = container.querySelector<HTMLButtonElement>('button[aria-label="Ebene hinzufügen"]')!;
    addButton.click();
    await flush();

    expect(boxes(container)).toHaveLength(3);
    expect(boxes(container)[2].value).toBe('');
  });

  it('liefert beim Ausfüllen der neuen Box den vollständigen String', async () => {
    let lastValue: string | undefined;
    const container = renderBoxes('V.IW', value => {
      lastValue = value;
    });

    container.querySelector<HTMLButtonElement>('button[aria-label="Ebene hinzufügen"]')!.click();
    await flush();
    setValue(boxes(container)[2], 'MI');

    expect(lastValue).toBe('V.IW-MI');
  });

  it('blendet den Hinzufügen-Button bei erreichter Obergrenze (10 Ebenen) aus', async () => {
    const container = renderBoxes('A.B-C-D-E-F-G-H-I-J', () => {});
    expect(boxes(container)).toHaveLength(10);

    expect(container.querySelector('button[aria-label="Ebene hinzufügen"]')).toBeNull();
  });

  it('entfernt nur die letzte Ebene über den Entfernen-Button', () => {
    let lastValue: string | undefined;
    const container = renderBoxes('V.IW-MI', value => {
      lastValue = value;
    });

    container.querySelector<HTMLButtonElement>('button[aria-label="Letzte Ebene entfernen"]')!.click();

    expect(lastValue).toBe('V.IW');
  });

  it('nimmt eine noch leere, gerade hinzugefügte Box beim Entfernen wieder zurück', async () => {
    let lastValue: string | undefined;
    const container = renderBoxes('V.IW', value => {
      lastValue = value;
    });

    container.querySelector<HTMLButtonElement>('button[aria-label="Ebene hinzufügen"]')!.click();
    await flush();
    expect(boxes(container)).toHaveLength(3);

    container.querySelector<HTMLButtonElement>('button[aria-label="Letzte Ebene entfernen"]')!.click();
    await flush();

    expect(boxes(container)).toHaveLength(2);
    expect(lastValue).toBe('V.IW');
  });

  it('startet bei leerem Wert mit defaultLevelCount Boxen', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<OeLevelBoxes value="" onChange={() => {}} defaultLevelCount={3} />, container);

    expect(boxes(container)).toHaveLength(3);
  });

  it('hält eine leere Ebene zwischen zwei ausgefüllten sichtbar', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    function Controlled() {
      const [value, setOe] = useState('');
      return <OeLevelBoxes value={value} onChange={setOe} defaultLevelCount={3} />;
    }
    render(<Controlled />, container);

    setValue(boxes(container)[0], 'V');
    await flush();
    setValue(boxes(container)[2], 'MI');
    await flush();

    expect(boxes(container).map(input => input.value)).toEqual(['V', '', 'MI']);
  });

  it('setzt vor eine numerische letzte Ebene kein Minus', () => {
    const container = renderBoxes('V.IW-MI 03', () => {});

    const separators = Array.from(container.querySelectorAll('span.text-body-secondary')).map(el => el.textContent);
    expect(separators).toEqual(['.', '-', '']);
  });

  it('lässt den Bindestrich vor einer leeren letzten Ebene weg und ergänzt ihn bei Nicht-Zahl-Eingabe', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    function Controlled() {
      const [value, setOe] = useState('V.IW-MI');
      return <OeLevelBoxes value={value} onChange={setOe} />;
    }
    render(<Controlled />, container);

    container.querySelector<HTMLButtonElement>('button[aria-label="Ebene hinzufügen"]')!.click();
    await flush();
    const separatorTexts = () =>
      Array.from(container.querySelectorAll('span.text-body-secondary')).map(el => el.textContent);
    expect(separatorTexts()).toEqual(['.', '-', '']);

    setValue(boxes(container)[3], '07');
    await flush();
    expect(separatorTexts()).toEqual(['.', '-', '']);

    setValue(boxes(container)[3], 'KSL');
    await flush();
    expect(separatorTexts()).toEqual(['.', '-', '-']);
  });

  it('erlaubt kein Entfernen der letzten verbleibenden Ebene', () => {
    const container = renderBoxes('V', () => {});

    expect(container.querySelector('button[aria-label="Letzte Ebene entfernen"]')).toBeNull();
  });

  it('blendet Hinzufügen/Entfernen im disabled-Zustand aus und deaktiviert die Boxen', () => {
    const container = renderBoxes('V.IW', () => {}, true);

    expect(container.querySelector('button[aria-label="Ebene hinzufügen"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Letzte Ebene entfernen"]')).toBeNull();
    expect(boxes(container).every(input => input.disabled)).toBe(true);
  });
});
