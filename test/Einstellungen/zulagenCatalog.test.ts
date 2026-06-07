import { describe, expect, it } from 'bun:test';
import {
  ZULAGEN_CATALOG,
  ZULAGEN_CATEGORY_MAX_SELECTIONS,
  ZulageCategory,
  ZulageEntryUnit,
  type IZulageCatalogItem,
} from '@/features/Einstellungen/utils/zulagenCatalog';

describe('zulagenCatalog', () => {
  it('enthält die erwartete Anzahl an Einträgen', () => {
    expect(ZULAGEN_CATALOG.length).toBe(24);
  });

  it('hat korrekte Struktur für jeden Eintrag', () => {
    for (const item of ZULAGEN_CATALOG) {
      expect(item).toHaveProperty('code');
      expect(item).toHaveProperty('paymentHint');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('entryRule');
      expect(typeof item.code).toBe('string');
      expect(typeof item.paymentHint).toBe('string');
      expect(typeof item.label).toBe('string');
      expect(typeof item.category).toBe('string');
      expect(typeof item.entryRule).toBe('object');
    }
  });

  it('enthält keine doppelten Codes', () => {
    const codes = ZULAGEN_CATALOG.map((i: IZulageCatalogItem) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('enthält bekannte Einträge', () => {
    const codes = ZULAGEN_CATALOG.map((i: IZulageCatalogItem) => i.code);
    expect(codes).toContain('040'); // Fahrentschädigung
    expect(codes).toContain('218'); // Ganzkörperreinigung
    expect(codes).toContain('839'); // Betriebsstörungen
    expect(codes).toContain('846'); // SIPO
  });

  it('hat die gewünschten Kategorie-Limits', () => {
    expect(ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Erschwerniszulage]).toBe(7);
    expect(ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.LeistungspramieUndFahrentschaedigung]).toBe(3);
    expect(ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Ganzkoerperreinigung]).toBe(1);
  });

  it('hinterlegt fachliche Eingaberegeln für bekannte Sonderfälle', () => {
    const fahrentschaedigung = ZULAGEN_CATALOG.find(item => item.code === '040');
    const betriebsstoerung = ZULAGEN_CATALOG.find(item => item.code === '839');
    const erschuetterung = ZULAGEN_CATALOG.find(item => item.code === '811');
    const reinigung = ZULAGEN_CATALOG.find(item => item.code === '218');

    expect(fahrentschaedigung?.entryRule.unit).toBe(ZulageEntryUnit.Stueck);
    expect(fahrentschaedigung?.entryRule.maxEntriesPerDay).toBe(1);

    expect(betriebsstoerung?.entryRule.unit).toBe(ZulageEntryUnit.Stueck);
    expect(betriebsstoerung?.entryRule.maxEntriesPerDay).toBe(1);
    expect(betriebsstoerung?.entryRule.exclusiveWithinCategoryPerDay).toBe(true);

    expect(erschuetterung?.entryRule.unit).toBe(ZulageEntryUnit.Minuten);
    expect(erschuetterung?.entryRule.minMinutesPerDay).toBe(60);
    expect(erschuetterung?.entryRule.calculationBlockedBelowMinimum).toBe(true);

    expect(reinigung?.entryRule.unit).toBe(ZulageEntryUnit.Stueck);
  });
});
