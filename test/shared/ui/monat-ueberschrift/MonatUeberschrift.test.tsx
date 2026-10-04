import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import MonatUeberschrift from '@/shared/ui/monat-ueberschrift/MonatUeberschrift';
import { resetMonatJahr, setMonatJahrStore } from '@/shared/model/period/monatJahrStore';
import { flushExtern } from '@/shared/lib/react-root/reactRoot';
import { render } from '@test/reactRender';

describe('MonatUeberschrift', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetMonatJahr();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('bleibt leer, solange kein Monat gesetzt ist', () => {
    render(<MonatUeberschrift id="MonatB" />, container);
    expect(container.querySelector('#MonatB')!.textContent).toBe('');
  });

  it('zeigt Monat/Jahr als "MM / YY" und folgt dem Store', () => {
    render(<MonatUeberschrift id="MonatB" />, container);

    flushExtern(() => setMonatJahrStore(2026, 3));
    expect(container.querySelector('#MonatB')!.textContent).toBe('03 / 26');

    flushExtern(() => setMonatJahrStore(2025, 12));
    expect(container.querySelector('#MonatB')!.textContent).toBe('12 / 25');
  });

  it('zeigt mit art="jahr" nur das Jahr', () => {
    render(<MonatUeberschrift id="MonatBerechnung" art="jahr" />, container);
    flushExtern(() => setMonatJahrStore(2026, 3));
    expect(container.querySelector('#MonatBerechnung')!.textContent).toBe('2026');
  });

  it('ein spaeter gemounteter Tab zeigt den gesetzten Wert sofort (Remount nach Tab-Aktivierung)', () => {
    flushExtern(() => setMonatJahrStore(2026, 9));
    render(<MonatUeberschrift id="MonatEA" />, container);
    expect(container.querySelector('#MonatEA')!.textContent).toBe('09 / 26');
  });
});
