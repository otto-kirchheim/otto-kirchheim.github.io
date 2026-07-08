import { describe, expect, it } from 'bun:test';
import { render, type ComponentProps } from 'preact';
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

  it('should not re-sync the popover when unrelated props change', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<MyInput type="text" id="myid" name="myname" value="a" />, container);
    const input = container.querySelector('input')!;

    render(<MyInput type="text" id="myid" name="myname" value="b" />, container);

    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('b');
  });
});
