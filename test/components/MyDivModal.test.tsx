import { describe, expect, it } from 'bun:test';
import { render } from '../reactRender';

import MyDivModal from '@/components/MyDivModal';

function renderMyDivModal(props: Parameters<typeof MyDivModal>[0]): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyDivModal {...props} />, container);
  return container;
}

describe('MyDivModal', () => {
  it('should render the default header, children and footer with default submit text', () => {
    const container = renderMyDivModal({ title: 'Test Titel', children: <p className="my-child">Kind</p> });

    expect(container.querySelector('.dialog-rumpf')).not.toBeNull();
    expect(container.querySelector('.dialog-rumpf')?.getAttribute('data-breite')).toBeNull();
    expect(container.querySelector('.db-drawer-header h2')?.textContent).toBe('Test Titel');
    expect(container.querySelector('.my-child')?.textContent).toBe('Kind');
    expect(container.querySelector('.dialog-fuss button[type="submit"]')?.textContent).toBe('Hinzufügen');
    expect(container.querySelector('.alert-danger')).toBeNull();
  });

  it('should mark the requested width on the dialog body when size is provided', () => {
    const container = renderMyDivModal({ title: 'Titel', size: 'lg' });

    expect(container.querySelector('.dialog-rumpf')?.getAttribute('data-breite')).toBe('lg');
  });

  it('should render the errorMessage alert with icon when errorMessage is provided', () => {
    const container = renderMyDivModal({ title: 'Titel', errorMessage: 'Etwas ist schiefgelaufen' });

    const alert = container.querySelector('.alert-danger');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Etwas ist schiefgelaufen');
    expect(alert?.querySelector('.db-icon')?.getAttribute('data-icon')).toBe('exclamation_mark_circle');
  });

  it('should pass helpContext through to the default MyModalHeader', () => {
    const container = renderMyDivModal({ title: 'Titel', helpContext: 'tab.start' });

    expect(container.querySelector('[data-icon="question_mark_circle"]')).not.toBeNull();
  });

  it('should render a custom Header instead of the default MyModalHeader', () => {
    const container = renderMyDivModal({
      title: 'Titel',
      Header: <div className="custom-header">Custom</div>,
    });

    expect(container.querySelector('.custom-header')?.textContent).toBe('Custom');
    expect(container.querySelector('.db-drawer-header')).toBeNull();
  });

  it('should render a custom Footer instead of the default MyEditorFooter', () => {
    const container = renderMyDivModal({
      title: 'Titel',
      Footer: <div className="custom-footer">CustomFooter</div>,
    });

    expect(container.querySelector('.custom-footer')?.textContent).toBe('CustomFooter');
    expect(container.querySelector('.dialog-fuss button[type="submit"]')).toBeNull();
  });

  it('should pass submitText and customButtons through to the default footer', () => {
    const container = renderMyDivModal({
      title: 'Titel',
      submitText: 'Speichern',
      customButtons: [
        <button key="extra" className="extra-btn">
          Extra
        </button>,
      ],
    });

    expect(container.querySelector('.dialog-fuss button[type="submit"]')?.textContent).toBe('Speichern');
    expect(container.querySelector('.extra-btn')?.textContent).toBe('Extra');
  });
});
