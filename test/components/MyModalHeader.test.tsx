import { describe, expect, it } from 'bun:test';
import { render } from '../reactRender';

import MyModalHeader from '@/components/MyModalHeader';

function renderMyModalHeader(props: Parameters<typeof MyModalHeader>[0]): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyModalHeader {...props} />, container);
  return container;
}

describe('MyModalHeader', () => {
  it('renders title and close button without a help trigger by default', () => {
    const container = renderMyModalHeader({ title: 'Test Titel' });

    expect(container.querySelector('.db-drawer-header h2')?.textContent).toBe('Test Titel');
    expect(container.querySelector('[data-action="close"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="question_mark_circle"]')).toBeNull();
  });

  it('renders a help trigger when helpContext is provided', () => {
    const container = renderMyModalHeader({ title: 'Test Titel', helpContext: 'tab.start' });

    const helpButton = container.querySelector('[data-icon="question_mark_circle"]');
    expect(helpButton).not.toBeNull();
    expect(helpButton?.textContent).toContain('Hilfe anzeigen');
  });

  it('verknuepft den umschliessenden <dialog> per aria-labelledby mit der Ueberschrift', async () => {
    const dialog = document.createElement('dialog');
    const container = document.createElement('div');
    dialog.appendChild(container);
    document.body.appendChild(dialog);
    render(<MyModalHeader title="Test Titel" />, container);
    for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0));

    const h2 = container.querySelector('h2')!;
    expect(h2.id).not.toBe('');
    expect(dialog.getAttribute('aria-labelledby')).toBe(h2.id);

    render(null, container);
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  });
});
