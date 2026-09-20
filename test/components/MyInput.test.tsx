import { describe, expect, it, mock } from 'bun:test';
import { type ComponentProps } from 'react';
import { render } from '@test/reactRender';

import MyInput from '@/components/MyInput';

function renderMyInput(props: ComponentProps<typeof MyInput>): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyInput {...props} />, container);
  return container;
}

describe('MyInput', () => {
  it('should render an input with the given id and name', () => {
    const container = renderMyInput({ type: 'text', id: 'myid', name: 'myname' });
    const input = container.querySelector('input');
    expect(input?.id).toBe('myid');
    expect(input?.name).toBe('myname');
  });

  it('should re-sync the popover when the popover prop changes on update', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<MyInput type="text" id="myid" name="myname" popover={{ content: 'erste' }} />, container);
    const input = container.querySelector('input')!;

    expect(() =>
      render(<MyInput type="text" id="myid" name="myname" popover={{ content: 'zweite' }} />, container),
    ).not.toThrow();

    expect(container.querySelector('input')).toBe(input);
  });

  it('behaelt das Eingabefeld, wenn sich unbeteiligte Props aendern', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<MyInput type="text" id="myid" name="myname" value="a" />, container);
    const input = container.querySelector('input')!;

    render(<MyInput type="text" id="myid" name="myname" value="b" />, container);

    expect(container.querySelector('input')).toBe(input);
    // Ohne `onChange` ist `value` nur eine Vorbelegung (React: `defaultValue`). Nach dem Mounten
    // schreibt React sie nicht mehr ins DOM -- Tippen des Nutzers bleibt dadurch erhalten.
    expect(input.value).toBe('a');
  });

  it('setzt eine Ungueltig-Meldung statt der DB-Notiz "TODO: Add an invalidMessage"', async () => {
    const container = renderMyInput({ type: 'text', id: 'myid', name: 'myname', required: true });
    for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)); // DBInput setzt _invalidMessage im Effect
    const meldung = container.querySelector('.db-infotext[data-semantic="critical"]');
    expect(meldung?.textContent).toBe('Bitte überprüfe diese Eingabe.');
    expect(container.innerHTML).not.toContain('TODO: Add an invalidMessage');
  });

  it('reicht eine feldspezifische Ungueltig-Meldung durch', async () => {
    const container = renderMyInput({
      type: 'text',
      id: 'myid',
      name: 'myname',
      required: true,
      invalidMessage: 'Pflichtfeld: SAP-Nummer angeben.',
    });
    for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0));
    const meldung = container.querySelector('.db-infotext[data-semantic="critical"]');
    expect(meldung?.textContent).toBe('Pflichtfeld: SAP-Nummer angeben.');
  });

  it('folgt dem Wert, wenn ein onChange-Handler das Feld steuert', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onChange = mock(() => {});
    render(<MyInput type="text" id="myid" name="myname" value="a" onChange={onChange} />, container);
    const input = container.querySelector('input')!;

    render(<MyInput type="text" id="myid" name="myname" value="b" onChange={onChange} />, container);

    expect(input.value).toBe('b');
  });
});
