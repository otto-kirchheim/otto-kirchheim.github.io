import { describe, expect, it, mock } from 'bun:test';
import { render } from 'preact';
import { BereitschaftOverridePanel } from '@/features/Bereitschaft/components/BereitschaftOverridePanel';
import type { IVorgabenUaZ } from '@/core/types';

function createAz(overrides: Partial<IVorgabenUaZ> = {}): IVorgabenUaZ {
  return {
    frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
    spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
    nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
    sonder: { aktiv: true, beginn: '20:15', ende: '07:00', pause: 20 },
    fahrzeit: '00:20',
    ...overrides,
  };
}

function renderPanel(
  aZ: IVorgabenUaZ | undefined,
  onChange = mock(() => {}),
): { container: HTMLDivElement; onChange: typeof onChange } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<BereitschaftOverridePanel aZ={aZ} onChange={onChange} />, container);
  return { container, onChange };
}

// Preact batches setState-triggered re-renders on a microtask; flush it before asserting on the DOM.
async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function fireChange(el: HTMLInputElement, checked: boolean): Promise<void> {
  el.checked = checked;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

async function fireInput(el: HTMLInputElement, value: string): Promise<void> {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

describe('BereitschaftOverridePanel', () => {
  it('rendert nichts wenn aZ.frueh fehlt', () => {
    const { container } = renderPanel(undefined);
    expect(container.querySelector('input')).toBeNull();
  });

  it('zeigt initial nur den geschlossenen Schalter, kein Editor-Panel', () => {
    const { container } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride');
    expect(toggle?.checked).toBe(false);
    expect(container.querySelector('.border.rounded.p-2.mt-1')).toBeNull();
  });

  it('öffnet das Panel und meldet leere Overrides beim Aktivieren des Schalters', async () => {
    const { container, onChange } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;

    await fireChange(toggle, true);

    expect(onChange).toHaveBeenCalledWith({});
    expect(container.querySelector('.border.rounded.p-2.mt-1')).not.toBeNull();
    expect(container.querySelector('#override-frueh')).not.toBeNull();
  });

  it('meldet undefined beim Schließen des Panels', async () => {
    const { container, onChange } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;

    await fireChange(toggle, true);
    onChange.mockClear();

    await fireChange(toggle, false);

    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(container.querySelector('.border.rounded.p-2.mt-1')).toBeNull();
  });

  it('reicht Wochentag-Overrides aus dem SchichtOverrideEditor durch', async () => {
    const { container, onChange } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;
    await fireChange(toggle, true);
    onChange.mockClear();

    const fruehOverride = container.querySelector<HTMLInputElement>('#override-frueh')!;
    await fireChange(fruehOverride, true);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ frueh: expect.objectContaining({ aktiv: true }) }));
  });

  it('zeigt den Sonderschicht-Bereich nur wenn #sonder-Checkbox im Dokument aktiv ist', async () => {
    const sonderCheckbox = document.createElement('input');
    sonderCheckbox.type = 'checkbox';
    sonderCheckbox.id = 'sonder';
    sonderCheckbox.checked = true;
    document.body.appendChild(sonderCheckbox);

    const { container, onChange } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;
    await fireChange(toggle, true);

    expect(container.querySelector('#sonderOverrideBeginn')).not.toBeNull();
    expect(container.querySelector('#sonderOverrideEnde')).not.toBeNull();

    const beginnInput = container.querySelector<HTMLInputElement>('#sonderOverrideBeginn')!;
    await fireInput(beginnInput, '21:00');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sonderOverride: expect.objectContaining({ beginn: '21:00', aktiv: true }) }),
    );

    const endeInput = container.querySelector<HTMLInputElement>('#sonderOverrideEnde')!;
    await fireInput(endeInput, '06:00');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sonderOverride: expect.objectContaining({ ende: '06:00' }) }),
    );

    const pauseInput = container.querySelector<HTMLInputElement>('input[type="number"]')!;
    await fireInput(pauseInput, '15');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sonderOverride: expect.objectContaining({ pause: 15 }) }),
    );

    const resetButton = Array.from(container.querySelectorAll('button')).find(b =>
      ['Zurücksetzen', 'Deaktivieren'].includes(b.textContent ?? ''),
    )!;
    resetButton.click();
    await flush();

    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ sonderOverride: expect.anything() }));

    document.body.removeChild(sonderCheckbox);
  });

  it('reagiert reaktiv auf Änderungen der #sonder-Checkbox im Dokument', async () => {
    const sonderCheckbox = document.createElement('input');
    sonderCheckbox.type = 'checkbox';
    sonderCheckbox.id = 'sonder';
    sonderCheckbox.checked = false;
    document.body.appendChild(sonderCheckbox);

    const { container } = renderPanel(createAz());
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;
    await fireChange(toggle, true);

    expect(container.querySelector('#sonderOverrideBeginn')).toBeNull();

    await fireChange(sonderCheckbox, true);

    expect(container.querySelector('#sonderOverrideBeginn')).not.toBeNull();

    document.body.removeChild(sonderCheckbox);
  });

  it('räumt den #sonder change-Listener beim Unmount auf', async () => {
    const sonderCheckbox = document.createElement('input');
    sonderCheckbox.type = 'checkbox';
    sonderCheckbox.id = 'sonder';
    document.body.appendChild(sonderCheckbox);
    const removeSpy = mock(sonderCheckbox.removeEventListener.bind(sonderCheckbox));
    sonderCheckbox.removeEventListener = removeSpy;

    const { container } = renderPanel(createAz());
    await flush();
    render(null, container);
    await flush();

    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));

    document.body.removeChild(sonderCheckbox);
  });

  it('blendet den Sonderschicht-Bereich aus wenn aZ.sonder.aktiv=false ist', async () => {
    const sonderCheckbox = document.createElement('input');
    sonderCheckbox.type = 'checkbox';
    sonderCheckbox.id = 'sonder';
    sonderCheckbox.checked = true;
    document.body.appendChild(sonderCheckbox);

    const { container } = renderPanel(
      createAz({ sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 } }),
    );
    const toggle = container.querySelector<HTMLInputElement>('#azOverride')!;
    await fireChange(toggle, true);

    expect(container.querySelector('#sonderOverrideBeginn')).toBeNull();

    document.body.removeChild(sonderCheckbox);
  });
});
