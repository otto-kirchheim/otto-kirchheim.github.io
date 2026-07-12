import { describe, expect, it } from 'bun:test';
import { render } from 'preact';
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

    expect(container.querySelector('.modal-title')?.textContent).toBe('Test Titel');
    expect(container.querySelector('.btn-close')).not.toBeNull();
    expect(container.querySelector('[aria-label="Hilfe anzeigen"]')).toBeNull();
  });

  it('renders a help trigger when helpContext is provided', () => {
    const container = renderMyModalHeader({ title: 'Test Titel', helpContext: 'tab.start' });

    const helpButton = container.querySelector('[aria-label="Hilfe anzeigen"]');
    expect(helpButton).not.toBeNull();
    expect(helpButton?.querySelector('.material-icons-round')?.textContent).toBe('help_outline');
  });
});
