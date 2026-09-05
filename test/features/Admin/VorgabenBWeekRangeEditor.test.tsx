import { describe, expect, it, mock } from 'bun:test';
import { useState } from 'react';
import { render } from '../../reactRender';

import {
  VorgabenBWeekRangeEditor,
  type WeekRangeEditorProps,
} from '@/features/Admin/components/VorgabenBWeekRangeEditor';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Die echte Komponente ist "controlled": start/end kommen vom Elternteil und werden erst durch
 * dessen Reaktion auf onStartChange/onEndChange aktualisiert (siehe useEffect-Snapback-Guard
 * gegen awaitingEndSelection). Ohne diesen Rueckkopplungs-Wrapper wuerde jeder zweite Klick den
 * intern gesetzten Slot wieder auf die (unveraenderten) Props zuruecksetzen.
 */
function ControlledHarness(props: {
  initialStart: { tag: number; Nwoche?: boolean };
  initialEnd: { tag: number; Nwoche?: boolean };
  startHasNwoche?: boolean;
  disabled?: boolean;
  onStartChangeSpy?: (tag: number, Nwoche: boolean) => void;
  onEndChangeSpy?: (tag: number, Nwoche: boolean) => void;
}) {
  const [start, setStart] = useState(props.initialStart);
  const [end, setEnd] = useState(props.initialEnd);
  return (
    <VorgabenBWeekRangeEditor
      selectorKey="k1"
      label="Bereitschaft"
      start={start}
      end={end}
      startHasNwoche={props.startHasNwoche ?? true}
      disabled={props.disabled ?? false}
      onStartChange={(tag, Nwoche) => {
        props.onStartChangeSpy?.(tag, Nwoche);
        setStart({ tag, Nwoche });
      }}
      onEndChange={(tag, Nwoche) => {
        props.onEndChangeSpy?.(tag, Nwoche);
        setEnd({ tag, Nwoche });
      }}
    />
  );
}

async function renderEditor(props: Partial<WeekRangeEditorProps> = {}): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(
    <VorgabenBWeekRangeEditor
      selectorKey="k1"
      label="Bereitschaft"
      start={{ tag: 1, Nwoche: false }}
      end={{ tag: 5, Nwoche: false }}
      startHasNwoche={true}
      disabled={false}
      onStartChange={props.onStartChange ?? mock()}
      onEndChange={props.onEndChange ?? mock()}
      {...props}
    />,
    container,
  );
  await flush();
  return container;
}

function buttons(container: HTMLDivElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

function pointerDown(button: HTMLButtonElement, pointerType: 'mouse' | 'touch' = 'touch'): void {
  button.dispatchEvent(new PointerEvent('pointerdown', { pointerType, bubbles: true }));
}

function pointerEnter(button: HTMLButtonElement): void {
  // React leitet `onPointerEnter` aus `pointerover` ab (EnterLeave-Plugin); ein natives
  // `pointerenter` bubbelt nicht und erreicht den Root-Listener daher nie.
  button.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body }));
}

function pointerUp(grid: HTMLElement): void {
  grid.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
}

describe('VorgabenBWeekRangeEditor', () => {
  it('zeigt die initiale Auswahl aus start/end-Props', async () => {
    const container = await renderEditor({ start: { tag: 1 }, end: { tag: 5 } });
    expect(container.textContent).toContain('Mo W1 -> Fr W1');
  });

  it('zeigt "..." als Ende, solange auf die End-Auswahl gewartet wird', async () => {
    const container = await renderEditor();
    buttons(container)[0].click();
    await flush();

    expect(container.textContent).toContain('-> ...');
  });

  it('setzt per zwei Klicks (Tap-Flow) Start und Ende', async () => {
    const onStartChangeSpy = mock();
    const onEndChangeSpy = mock();
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      <ControlledHarness
        initialStart={{ tag: 1, Nwoche: false }}
        initialEnd={{ tag: 5, Nwoche: false }}
        onStartChangeSpy={onStartChangeSpy}
        onEndChangeSpy={onEndChangeSpy}
      />,
      container,
    );
    await flush();

    buttons(container)[0].click(); // Mo (slot 0)
    await flush();
    buttons(container)[2].click(); // Mi (slot 2)
    await flush();

    expect(onStartChangeSpy).toHaveBeenCalledWith(1, false);
    expect(onEndChangeSpy).toHaveBeenCalledWith(3, false);
    expect(container.textContent).toContain('Mo W1 -> Mi W1');
  });

  it('verhindert ein Ende vor dem Start (klemmt auf den Start-Slot)', async () => {
    const onEndChange = mock();
    const container = await renderEditor({ onEndChange });

    buttons(container)[5].click(); // Sa (slot 5) als Start
    await flush();
    buttons(container)[1].click(); // Di (slot 1), liegt vor dem Start
    await flush();

    expect(onEndChange).toHaveBeenCalledWith(6, false); // slot 5 selbst (Sa)
  });

  it('reagiert nicht auf Klicks, wenn disabled=true', async () => {
    const onStartChange = mock();
    const container = await renderEditor({ disabled: true, onStartChange });

    buttons(container)[0].click();
    await flush();

    expect(onStartChange).not.toHaveBeenCalled();
    expect(buttons(container)[0].disabled).toBe(true);
  });

  it('erzwingt Nwoche=false für den Start, wenn startHasNwoche=false ist', async () => {
    const onStartChange = mock();
    const container = await renderEditor({ startHasNwoche: false, onStartChange });

    buttons(container)[9].click(); // Slot 9 -> Woche 2, aber startHasNwoche=false

    expect(onStartChange).toHaveBeenCalledWith(3, false);
  });

  it('setzt per Maus-Drag (pointerdown+pointerenter+pointerup) einen Bereich in einem Zug', async () => {
    const onStartChangeSpy = mock();
    const onEndChangeSpy = mock();
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      <ControlledHarness
        initialStart={{ tag: 1, Nwoche: false }}
        initialEnd={{ tag: 5, Nwoche: false }}
        onStartChangeSpy={onStartChangeSpy}
        onEndChangeSpy={onEndChangeSpy}
      />,
      container,
    );
    await flush();
    const grid = container.querySelector('.d-grid') as HTMLElement;

    pointerDown(buttons(container)[1], 'mouse'); // Di
    await flush();
    pointerEnter(buttons(container)[4]); // Fr
    await flush();
    pointerUp(grid);
    await flush();

    expect(onStartChangeSpy).toHaveBeenCalledWith(2, false);
    expect(onEndChangeSpy).toHaveBeenCalledWith(5, false);
    expect(container.textContent).toContain('Di W1 -> Fr W1');
  });

  it('ignoriert pointerenter ohne aktiven Drag-Anker', async () => {
    const onEndChange = mock();
    const container = await renderEditor({ onEndChange });

    pointerEnter(buttons(container)[4]);
    await flush();

    expect(onEndChange).not.toHaveBeenCalled();
  });

  it('mappt Legacy-Tag 0 (Sonntag vor Migration) auf Slot 6', async () => {
    const container = await renderEditor({ start: { tag: 0, Nwoche: false }, end: { tag: 0, Nwoche: false } });

    expect(container.textContent).toContain('So W1');
  });
});
