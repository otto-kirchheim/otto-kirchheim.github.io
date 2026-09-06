import { describe, expect, it, mock } from 'bun:test';
import { render } from '../reactRender';

import MyButton from '@/components/MyButton';
import { buttonLook } from '@/infrastructure/ui/dbButton';

function renderButton(node: React.ReactElement): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(node, container);
  return container;
}

describe('buttonLook', () => {
  it('uebersetzt die Bootstrap-Varianten in DB-Props', () => {
    expect(buttonLook('btn btn-primary')).toMatchObject({ variant: 'brand', rest: '' });
    expect(buttonLook('btn btn-danger')).toMatchObject({ variant: 'filled', color: 'critical' });
    expect(buttonLook('btn btn-outline-info')).toMatchObject({ variant: 'outlined', color: 'informational' });
    expect(buttonLook('btn btn-link')).toMatchObject({ variant: 'ghost' });
  });

  it('uebersetzt Groesse und Breite und reicht unbekannte Klassen weiter', () => {
    expect(buttonLook('btn btn-secondary btn-lg text-start w-100')).toMatchObject({
      variant: 'filled',
      size: 'medium',
      width: 'full',
      rest: 'text-start',
    });
    expect(buttonLook('btn btn-sm')).toMatchObject({ size: 'small' });
  });
});

describe('MyButton', () => {
  it('rendert einen DBButton mit Text, Typ und Klick-Handler', () => {
    const clickHandler = mock(() => {});
    const container = renderButton(<MyButton text="Speichern" type="submit" clickHandler={clickHandler} />);
    const button = container.querySelector('button')!;

    expect(button.className).toContain('db-button');
    expect(button.textContent).toBe('Speichern');
    expect(button.type).toBe('submit');
    expect(button.getAttribute('aria-label')).toBe('Speichern');

    button.click();
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it('reicht die Bootstrap-Modal-Attribute weiter, solange die Modal-Shell Bootstrap ist', () => {
    const container = renderButton(<MyButton text="Abbrechen" className="btn btn-secondary" dataBsDismiss="modal" />);
    const button = container.querySelector('button')!;

    expect(button.getAttribute('data-bs-dismiss')).toBe('modal');
    expect(button.getAttribute('data-variant')).toBe('filled');
  });
});
