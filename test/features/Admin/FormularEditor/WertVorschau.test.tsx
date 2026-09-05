import { describe, expect, it } from 'bun:test';
import { render } from '../../../reactRender';

import { WertVorschau } from '@/features/Admin/components/FormularEditor/WertVorschau';

function renderWertVorschau(text: string): HTMLDivElement {
  const container = document.createElement('div');
  render(<WertVorschau text={text} />, container);
  return container;
}

describe('WertVorschau', () => {
  it('zeigt "(leer)" bei leerem Text', () => {
    const container = renderWertVorschau('');
    expect(container.querySelector('em')?.textContent).toBe('(leer)');
    expect(container.querySelector('.font-monospace')).toBeNull();
  });

  it('zeigt den Text monospaced, wenn nicht leer', () => {
    const container = renderWertVorschau('Beispielwert');
    expect(container.querySelector('.font-monospace')?.textContent).toBe('Beispielwert');
    expect(container.querySelector('em')).toBeNull();
  });
});
