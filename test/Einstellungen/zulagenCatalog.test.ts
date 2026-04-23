import { describe, expect, it } from 'bun:test';
import { ZULAGEN_CATALOG, type IZulageCatalogItem } from '../../src/ts/features/Einstellungen/utils/zulagenCatalog';

describe('zulagenCatalog', () => {
  it('enthält die erwartete Anzahl an Einträgen', () => {
    expect(ZULAGEN_CATALOG.length).toBe(23);
  });

  it('hat korrekte Struktur für jeden Eintrag', () => {
    for (const item of ZULAGEN_CATALOG) {
      expect(item).toHaveProperty('code');
      expect(item).toHaveProperty('paymentHint');
      expect(item).toHaveProperty('label');
      expect(typeof item.code).toBe('string');
      expect(typeof item.paymentHint).toBe('string');
      expect(typeof item.label).toBe('string');
    }
  });

  it('enthält keine doppelten Codes', () => {
    const codes = ZULAGEN_CATALOG.map((i: IZulageCatalogItem) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('enthält bekannte Einträge', () => {
    const codes = ZULAGEN_CATALOG.map((i: IZulageCatalogItem) => i.code);
    expect(codes).toContain('040'); // Fahrentschädigung
    expect(codes).toContain('839'); // Betriebsstörungen
    expect(codes).toContain('846'); // SIPO
  });
});
