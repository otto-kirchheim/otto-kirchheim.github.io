import { describe, expect, it, mock } from 'bun:test';
import { type ComponentProps } from 'react';
import { render } from '../reactRender';

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
