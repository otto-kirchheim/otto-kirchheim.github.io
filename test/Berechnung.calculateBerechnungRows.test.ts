import { describe, expect, it } from 'bun:test';
import { VorgabenGeldMock, datenBerechungMock } from './mockData';
import calculateBerechnungRows, { formatCurrency } from '@/features/Berechnung/calculateBerechnungRows';
import type { IVorgabenBerechnung, IVorgabenGeld } from '@/types';

// formatCurrency trennt Betrag und Euro-Zeichen mit geschütztem Leerzeichen (U+00A0)
const eur = (betrag: string): string => `${betrag}\u00a0€`;

describe('#calculateBerechnungRows', () => {
  it('berechnet alle Zeilenwerte identisch zur bisherigen Tabellenausgabe (Tarifkraft)', () => {
    const ergebnisse = calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft');

    expect(ergebnisse.length).toBe(Object.keys(datenBerechungMock).length);

    for (const [index, ergebnis] of ergebnisse.entries()) {
      expect(ergebnis.monat).toBe(index + 1);
      expect(ergebnis.bereitschaftMinuten).toBe(6000);
      expect(ergebnis.bereitschaftAnzeige).toBe('100:00');
      expect(formatCurrency(ergebnis.bereitschaftszulage!)).toBe(eur('258,00'));
      expect(formatCurrency(ergebnis.lre1!)).toBe(eur('70,94'));
      expect(formatCurrency(ergebnis.lre2!)).toBe(eur('46,43'));
      expect(formatCurrency(ergebnis.lre3!)).toBe(eur('26,57'));
      expect(formatCurrency(ergebnis.privatPkw!)).toBe(eur('4,05'));
      expect(formatCurrency(ergebnis.summeBereitschaft!)).toBe(eur('405,99'));
      expect(ergebnis.abwesenheiten).toEqual({ a8: 15, a14: 1, a24: 1 });
      expect(ergebnis.steuerfreieAbwesenheiten).toEqual({ s8: 15, s14: 1 });
      expect(formatCurrency(ergebnis.summeEwt!)).toBe(eur('77,20'));
      expect(formatCurrency(ergebnis.summeNebenbezuege!)).toBe(eur('13,30'));
      expect(formatCurrency(ergebnis.summeGesamt!)).toBe(eur('496,49'));
    }
  });

  it('liefert null für alle Anzeigen in einem leeren Monat', () => {
    const leererMonat = {
      1: {
        B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
        E: { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 },
        N: { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 },
      },
    } as unknown as IVorgabenBerechnung;

    const [ergebnis] = calculateBerechnungRows(leererMonat, VorgabenGeldMock, 'Tarifkraft');

    expect(ergebnis.bereitschaftMinuten).toBeNull();
    expect(ergebnis.bereitschaftAnzeige).toBeNull();
    expect(ergebnis.bereitschaftszulage).toBeNull();
    expect(ergebnis.lre1).toBeNull();
    expect(ergebnis.summeBereitschaft).toBeNull();
    expect(ergebnis.abwesenheiten).toBeNull();
    expect(ergebnis.steuerfreieAbwesenheiten).toBeNull();
    expect(ergebnis.summeEwt).toBeNull();
    expect(ergebnis.summeNebenbezuege).toBeNull();
    expect(ergebnis.summeGesamt).toBeNull();
  });

  it('merged mehrmonatige VorgabenGeld-Overrides und rechnet Beamte (S8) mit BE8', () => {
    const geldMonat1 = { ...VorgabenGeldMock[1], BE8: 9, BE14: 24 };
    const geldMonat2 = { ...VorgabenGeldMock[1], BE8: 999, BE14: 24 };
    const multiMonthVorgabenGeld: IVorgabenGeld = { 1: geldMonat1, 2: geldMonat2 };

    const datenMonat2 = {
      2: {
        B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
        E: { A8: 0, A14: 0, A24: 0, S8: 2, S14: 0 },
        N: { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 },
      },
    } as unknown as IVorgabenBerechnung;

    const [ergebnis] = calculateBerechnungRows(datenMonat2, multiMonthVorgabenGeld, 'Besoldungsgruppe A 8');

    expect(ergebnis.monat).toBe(2);
    expect(ergebnis.summeEwt).toBe(2 * 999);
    expect(ergebnis.steuerfreieAbwesenheiten).toEqual({ s8: 2, s14: 0 });
    expect(ergebnis.summeGesamt).toBe(2 * 999);
  });
});
