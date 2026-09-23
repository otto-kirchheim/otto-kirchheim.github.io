import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import BerechnungTab from '@/pages/berechnung/ui/BerechnungTab';
import { render } from '@test/reactRender';

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Der Hilfe-Knopf war in P1h zunaechst vergessen worden (Berechnung hatte keine Hilfe); dieser Test haelt ihn fest. */
describe('BerechnungTab: Hilfe-Knopf', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('oeffnet die Hilfe von "tab.berechnung" ueber #btnHelpBerechnung', async () => {
    render(<BerechnungTab />, container);

    container.querySelector<HTMLButtonElement>('#btnHelpBerechnung')!.click();
    await tick();

    const modal = document.body.querySelector<HTMLDialogElement>('dialog.db-drawer');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Berechnung');
    expect(modal?.textContent).toContain('Monatsfenster');
  });
});
