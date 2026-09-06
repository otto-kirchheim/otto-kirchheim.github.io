import { describe, expect, it } from 'bun:test';
import { createRef } from 'react';
import { render, setzeWert } from '../reactRender';

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
  setzeWert(input, value);
  await flush();
}

/** Gefuellte Balken tragen seit Phase C den DB-Token der Semantik als Inline-Hintergrund. */
function gefuellteBalken(container: HTMLElement, semantik: string): number {
  return Array.from(container.querySelectorAll<HTMLDivElement>('div[style]')).filter(el =>
    el.style.background.includes(`--db-${semantik}-origin-default`),
  ).length;
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
    expect(gefuellteBalken(container, 'critical')).toBe(1);
  });

  it('zeigt "Schwach" bei zwei erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'aaaaaaaa');

    expect(container.textContent).toBe('Schwach');
    expect(gefuellteBalken(container, 'warning')).toBe(2);
  });

  it('zeigt "Mittel" bei drei erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'Aaaaaaaa');

    expect(container.textContent).toBe('Mittel');
    expect(gefuellteBalken(container, 'informational')).toBe(3);
  });

  it('zeigt "Stark" bei vier oder mehr erfüllten Regeln', async () => {
    const { container, input } = setup();
    await typePassword(input, 'Aaaaaaa1');

    expect(container.textContent).toBe('Stark');
    expect(gefuellteBalken(container, 'successful')).toBe(4);
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
