import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import setMonatJahr from '../../src/ts/Einstellungen/utils/setMonatJahr';

describe('setMonatJahr', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <input id="Monat" />
      <h2 id="MonatB"></h2>
      <h2 id="MonatE"></h2>
      <h2 id="MonatN"></h2>
      <h2 id="MonatBerechnung"></h2>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('setzt Monat-Input und Überschriften korrekt', () => {
    setMonatJahr(2026, 3);

    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('3');
    expect(document.querySelector<HTMLHeadingElement>('#MonatB')!.innerText).toBe('03 / 26');
    expect(document.querySelector<HTMLHeadingElement>('#MonatE')!.innerText).toBe('03 / 26');
    expect(document.querySelector<HTMLHeadingElement>('#MonatN')!.innerText).toBe('03 / 26');
    expect(document.querySelector<HTMLHeadingElement>('#MonatBerechnung')!.innerText).toBe('2026');
  });

  it('setzt Werte korrekt für Januar', () => {
    setMonatJahr(2025, 1);

    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('1');
    expect(document.querySelector<HTMLHeadingElement>('#MonatB')!.innerText).toBe('01 / 25');
  });

  it('setzt Werte korrekt für Dezember', () => {
    setMonatJahr(2026, 12);

    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('12');
    expect(document.querySelector<HTMLHeadingElement>('#MonatB')!.innerText).toBe('12 / 26');
  });

  it('wirft Fehler wenn DOM-Elemente fehlen', () => {
    container.remove();
    expect(() => setMonatJahr(2026, 3)).toThrow('One or more elements not found.');
  });
});
