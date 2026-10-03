import { describe, expect, it } from 'bun:test';
import { render } from '@test/reactRender';

import { WertVorschau } from '@/pages/admin/ui/FormularEditor/WertVorschau';

function renderWertVorschau(text: string): HTMLDivElement {
  const container = document.createElement('div');
  render(<WertVorschau text={text} />, container);
  return container;
}

describe('WertVorschau', () => {
  it('zeigt "(leer)" bei leerem Text', () => {
    const container = renderWertVorschau('');
    expect(container.querySelector('em')?.textContent).toBe('(leer)');
    expect(container.querySelector('.schrift-mono')).toBeNull();
  });

  it('zeigt den Text monospaced, wenn nicht leer', () => {
    const container = renderWertVorschau('Beispielwert');
    expect(container.querySelector('.schrift-mono')?.textContent).toBe('Beispielwert');
    expect(container.querySelector('em')).toBeNull();
  });
});
