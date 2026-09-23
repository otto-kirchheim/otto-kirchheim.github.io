import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import setMonatJahr, { setMonatsUeberschriften } from '@/features/Einstellungen/utils/setMonatJahr';
import { getMonatJahr, resetMonatJahr } from '@/shared/model/period/monatJahrStore';

describe('setMonatJahr', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetMonatJahr();
    container = document.createElement('div');
    container.innerHTML = '<input id="Monat" />';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('setzt Monat-Input und Store (Monat/Jahr der Ueberschriften)', () => {
    setMonatJahr(2026, 3);

    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('3');
    expect(getMonatJahr()).toEqual({ monat: 3, jahr: 2026 });
  });

  it('setMonatsUeberschriften wirft nie und setzt den Store auch ohne Felder im DOM', () => {
    container.remove();
    expect(() => setMonatsUeberschriften(2026, 3)).not.toThrow();
    expect(getMonatJahr()).toEqual({ monat: 3, jahr: 2026 });
  });

  it('setzt Werte korrekt fuer Januar und Dezember', () => {
    setMonatJahr(2025, 1);
    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('1');
    expect(getMonatJahr()).toEqual({ monat: 1, jahr: 2025 });

    setMonatJahr(2026, 12);
    expect(document.querySelector<HTMLInputElement>('#Monat')!.value).toBe('12');
    expect(getMonatJahr()).toEqual({ monat: 12, jahr: 2026 });
  });

  it('wirft Fehler wenn #Monat fehlt und laesst den Store unberuehrt', () => {
    container.remove();
    expect(() => setMonatJahr(2026, 3)).toThrow('One or more elements not found.');
    expect(getMonatJahr()).toBeNull();
  });
});
