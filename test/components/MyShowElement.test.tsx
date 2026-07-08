import { describe, expect, it } from 'bun:test';
import { render } from 'preact';
import dayjs from '@/infrastructure/date/configDayjs';
import MyShowElement from '@/components/MyShowElement';

function renderMyShowElement(props: Parameters<typeof MyShowElement>[0]): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyShowElement {...props} />, container);
  return container;
}

describe('MyShowElement', () => {
  it('should render default classes, title, id and a non-breaking space when text is omitted', () => {
    const container = renderMyShowElement({ title: 'Titel', id: 'myid' });

    const div = container.querySelector('div');
    const label = container.querySelector('label');
    const span = container.querySelector('span');

    expect(div?.className).toBe('mb-1 row');
    expect(label?.className).toBe('col-3 col-form-label text-wrap fw-bold');
    expect(label?.getAttribute('for')).toBe('myid');
    expect(label?.textContent).toBe('Titel');
    expect(span?.className).toBe('col-9 align-middle text-break my-auto');
    expect(span?.id).toBe('myid');
    expect(span?.textContent).toBe(' ');
  });

  it('should render a string text value as-is', () => {
    const container = renderMyShowElement({ title: 'Titel', id: 'myid', text: 'Hallo Welt' });

    expect(container.querySelector('span')?.textContent).toBe('Hallo Welt');
  });

  it('should convert a number text value to its string representation', () => {
    const container = renderMyShowElement({ title: 'Titel', id: 'myid', text: 42 });

    expect(container.querySelector('span')?.textContent).toBe('42');
  });

  it('should convert a Date text value to its string representation', () => {
    const date = new Date(2024, 0, 15);
    const container = renderMyShowElement({ title: 'Titel', id: 'myid', text: date });

    expect(container.querySelector('span')?.textContent).toBe(date.toString());
  });

  it('should convert a Dayjs text value to its string representation', () => {
    const value = dayjs('2024-05-01');
    const container = renderMyShowElement({ title: 'Titel', id: 'myid', text: value });

    expect(container.querySelector('span')?.textContent).toBe(value.toString());
  });

  it('should apply custom divClass, labelClass and spanClass when provided', () => {
    const container = renderMyShowElement({
      title: 'Titel',
      id: 'myid',
      divClass: 'custom-div',
      labelClass: 'custom-label',
      spanClass: 'custom-span',
    });

    expect(container.querySelector('div')?.className).toBe('custom-div');
    expect(container.querySelector('label')?.className).toBe('custom-label');
    expect(container.querySelector('span')?.className).toBe('custom-span');
  });
});
