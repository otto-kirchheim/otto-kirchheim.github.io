import { describe, expect, it } from 'bun:test';
import calculateZulagenBreakdown from '@/features/Berechnung/calculateZulagenBreakdown';
import { ZulageEntryUnit } from '@/features/Einstellungen/utils/zulagenCatalog';
import type { IDatenN } from '@/types';

const tag = (tagN: string, zulagenN: Array<{ code: string; value: number }>): IDatenN =>
  ({
    tagN,
    beginN: '08:00',
    endeN: '16:00',
    auftragN: 'A1',
    zulagenN,
  }) as unknown as IDatenN;

describe('#calculateZulagenBreakdown', () => {
  it('liefert keinen Breakdown ohne Zulagen im Jahr', () => {
    const breakdown = calculateZulagenBreakdown([tag('05.01.2026', [])]);

    expect(breakdown.codes).toEqual([]);
  });

  it('liefert keinen Breakdown bei nur einem Code im Jahr', () => {
    const breakdown = calculateZulagenBreakdown([
      tag('05.01.2026', [{ code: '040', value: 1 }]),
      tag('12.03.2026', [{ code: '040', value: 2 }]),
    ]);

    expect(breakdown.codes.map(c => c.code)).toEqual(['040']);
    expect(breakdown.values['040'][0]).toBe(1);
    expect(breakdown.values['040'][2]).toBe(2);
  });

  it('aggregiert mehrere Codes pro Monat mit 0 in Monaten ohne Daten', () => {
    const breakdown = calculateZulagenBreakdown([
      tag('05.01.2026', [
        { code: '040', value: 1 },
        { code: '839', value: 1 },
      ]),
      tag('06.01.2026', [{ code: '040', value: 1 }]),
      tag('10.05.2026', [{ code: '846', value: 120 }]),
    ]);
    expect(breakdown.codes.map(c => c.code)).toEqual(['040', '839', '846']);

    expect(breakdown.values['040'][0]).toBe(2); // Januar: 1 + 1
    expect(breakdown.values['040'][4]).toBe(0); // Mai: keine 040-Daten
    expect(breakdown.values['839'][0]).toBe(1);
    expect(breakdown.values['846'][4]).toBe(120);
    expect(breakdown.values['846'][0]).toBe(0);
  });

  it('nutzt Katalog-Labels und Einheiten, unbekannte Codes bleiben roh (Stück)', () => {
    const breakdown = calculateZulagenBreakdown([
      tag('05.01.2026', [
        { code: '040', value: 1 },
        { code: '846', value: 60 },
        { code: 'XX9', value: 3 },
      ]),
    ]);

    const byCode = new Map(breakdown.codes.map(c => [c.code, c]));
    expect(byCode.get('040')?.label).toBe('040 Fahrentsch.');
    expect(byCode.get('040')?.unit).toBe(ZulageEntryUnit.Stueck);
    expect(byCode.get('846')?.unit).toBe(ZulageEntryUnit.Minuten);
    expect(byCode.get('XX9')?.label).toBe('XX9');
    expect(byCode.get('XX9')?.unit).toBe(ZulageEntryUnit.Stueck);
  });

  it('unterstützt Legacy-Einträge mit anzahl040N', () => {
    const legacyTag = {
      tagN: '05.02.2026',
      beginN: '08:00',
      endeN: '16:00',
      auftragN: 'A1',
      anzahl040N: 2,
    } as unknown as IDatenN;

    const breakdown = calculateZulagenBreakdown([legacyTag, tag('05.03.2026', [{ code: '839', value: 1 }])]);
    expect(breakdown.values['040'][1]).toBe(2);
    expect(breakdown.values['839'][2]).toBe(1);
  });
});
