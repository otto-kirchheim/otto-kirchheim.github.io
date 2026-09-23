import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import '@/app/features';
import AppHeader from '@/widgets/app-header/AppHeader';
import StartTab from '@/infrastructure/ui/StartTab';
import { render } from '@test/reactRender';

/** Nav, Start-Schnellzugriff und Panes entstehen aus `meta` -- die DOM-Ids bleiben die bisherigen Vertraege. */
describe('Feature-Shell aus meta', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('AppHeader rendert je Feature einen Nav-Eintrag mit bisherigen Ids, Ziel-Pane und Kurzlabel', () => {
    render(<AppHeader />, container);

    const ids = ['bereitschaft-tab', 'ewt-tab', 'neben-tab', 'ea-tab'];
    for (const id of ids) expect(container.querySelector(`#${id}`)).not.toBeNull();

    const neben = container.querySelector<HTMLAnchorElement>('#neben-tab');
    expect(neben?.getAttribute('href')).toBe('#Neben');
    expect(neben?.getAttribute('data-tab-target')).toBe('Neben');
    expect(neben?.getAttribute('aria-controls')).toBe('Neben');
    expect(neben?.textContent).toBe('Zulagen');
    expect(container.querySelector('#ea-tab')?.textContent).toBe('Entgeltausgleich');
  });

  it('StartTab rendert je Feature einen Schnellzugriff quick-<navId> mit data-jump-tab', () => {
    render(<StartTab />, container);

    const quick = container.querySelector('#quick-neben-tab');
    expect(quick?.classList.contains('d-none')).toBe(true);
    expect(quick?.querySelector('[data-jump-tab="neben-tab"]')).not.toBeNull();
    for (const id of ['quick-bereitschaft-tab', 'quick-ewt-tab', 'quick-ea-tab'])
      expect(container.querySelector(`#${id}`)).not.toBeNull();
  });
});
