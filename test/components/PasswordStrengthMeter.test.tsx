import { describe, expect, it } from 'bun:test';
import { createRef, render } from 'preact';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function setup(): { container: HTMLDivElement; input: HTMLInputElement } {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const ref = createRef<HTMLInputElement>();
  (ref as { current: HTMLInputElement }).current = input;

  const container = document.createElement('div');
  render(<PasswordStrengthMeter passwordInputRef={ref} />, container);
  return { container, input };
}

async function typePassword(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

describe('PasswordStrengthMeter', () => {
  it('rendert nichts, solange kein Wert eingegeben wurde', () => {
    const { container } = setup();
    expect(container.innerHTML).toBe('');
  });

  it('zeigt "Zu schwach" bei nur einer erfüllten Regel', async () => {
    const { container, input } = setup();
    await typePassword(input, 'aaa');

    expect(container.textContent).toBe('Zu schwach');
    expect(container.querySelectorAll('.bg-danger').length).toBe(1);
  });

  it('zeigt "Schwach" bei zwei erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'aaaaaaaa');

    expect(container.textContent).toBe('Schwach');
    expect(container.querySelectorAll('.bg-warning').length).toBe(2);
  });

  it('zeigt "Mittel" bei drei erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'Aaaaaaaa');

    expect(container.textContent).toBe('Mittel');
    expect(container.querySelectorAll('.bg-info').length).toBe(3);
  });

  it('zeigt "Stark" bei vier oder mehr erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'Aaaaaaa1');

    expect(container.textContent).toBe('Stark');
    expect(container.querySelectorAll('.bg-success').length).toBe(4);
  });

  it('setzt die Anzeige zurück, wenn das Feld geleert wird', async () => {
    const { container, input } = setup();
    await typePassword(input, 'Aaaaaaa1');
    expect(container.innerHTML).not.toBe('');

    await typePassword(input, '');

    expect(container.innerHTML).toBe('');
  });

  it('reagiert nach dem Unmount nicht mehr auf Eingaben', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const ref = createRef<HTMLInputElement>();
    (ref as { current: HTMLInputElement }).current = input;
    const container = document.createElement('div');
    render(<PasswordStrengthMeter passwordInputRef={ref} />, container);

    render(null, container);
    await typePassword(input, 'Aaaaaaa1');

    expect(container.innerHTML).toBe('');
  });
});
