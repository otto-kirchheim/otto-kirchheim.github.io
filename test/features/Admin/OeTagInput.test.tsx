import { describe, expect, it } from 'bun:test';
import { render, setzeWert } from '../../reactRender';

import { OeTagInput } from '@/features/Admin/components/OeTagInput';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function renderInput(props: Partial<Parameters<typeof OeTagInput>[0]> = {}): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(
    <OeTagInput
      label="Organisationseinheiten"
      values={props.values ?? []}
      onChange={props.onChange ?? (() => {})}
      {...props}
    />,
    container,
  );
  return container;
}

function levelInputs(container: HTMLDivElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]'));
}

async function setValue(input: HTMLInputElement, value: string): Promise<void> {
  setzeWert(input, value);
  await flush();
}

function addButton(container: HTMLDivElement): HTMLButtonElement | undefined {
  // Der Hinzufuegen-Knopf traegt das Plus-Symbol; die Entfernen-Knoepfe sitzen in den Tags.
  return container.querySelector<HTMLButtonElement>('button[aria-label="Wert hinzufügen"]') ?? undefined;
}

describe('OeTagInput', () => {
  it('zeigt "Keine" bei leerer values-Liste', () => {
    const container = renderInput({ values: [] });
    expect(container.textContent).toContain('Keine');
  });

  it('rendert jeden Wert als Badge', () => {
    const container = renderInput({ values: ['V.IW-MI', 'V.IW-N'] });
    const badges = container.querySelectorAll('.badge');
    expect(badges.length).toBe(2);
    expect(badges[0].textContent).toContain('V.IW-MI');
  });

  it('fügt einen getrimmten, neuen Wert per Add-Button hinzu', async () => {
    let current: string[] = [];
    const container = renderInput({
      values: current,
      onChange: v => {
        current = v;
      },
    });

    await setValue(levelInputs(container)[0], '  V  ');
    expect(addButton(container)?.disabled).toBe(false);
    addButton(container)?.click();

    expect(current).toEqual(['V']);
  });

  it('deaktiviert den Add-Button bei leerer/nur-Whitespace-Eingabe', async () => {
    const container = renderInput({ values: [] });
    expect(addButton(container)?.disabled).toBe(true);

    await setValue(levelInputs(container)[0], '   ');
    expect(addButton(container)?.disabled).toBe(true);
  });

  it('fügt einen bereits vorhandenen Wert nicht doppelt hinzu', async () => {
    const onChange = () => {
      throw new Error('onChange sollte nicht aufgerufen werden');
    };
    const container = renderInput({ values: ['V'], onChange });

    await setValue(levelInputs(container)[0], 'V');
    expect(() => addButton(container)?.click()).not.toThrow();
  });

  it('entfernt einen Wert per Remove-Button', () => {
    let current = ['V', 'IW'];
    const container = renderInput({
      values: current,
      onChange: v => {
        current = v;
      },
    });

    (container.querySelector('.badge .db-button[data-icon="cross"]') as HTMLButtonElement).click();

    expect(current).toEqual(['IW']);
  });

  it('blendet Eingabe-Bereich und Remove-Buttons aus, wenn disabled=true', () => {
    const container = renderInput({ values: ['V'], disabled: true });

    expect(container.querySelector('.db-button[data-icon="cross"]')).toBeNull();
    expect(addButton(container)).toBeUndefined();
  });

  it('zeigt den übergebenen Placeholder-Text', () => {
    const container = renderInput({ values: [], placeholder: 'Bitte OE eingeben' });
    expect(container.textContent).toContain('Bitte OE eingeben');
  });
});
