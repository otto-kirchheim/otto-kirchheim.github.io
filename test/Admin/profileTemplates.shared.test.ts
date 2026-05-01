import { describe, expect, it } from 'bun:test';

import {
  normalizeVorgabenBRows,
  ARBEITSZEIT_FIELDS,
  PERS_FIELDS,
  TAB_OPTIONS,
  WEEKDAY_OPTIONS,
} from '@/features/Admin/components/profileTemplates.shared';
import type { VorgabenBRow } from '@/features/Admin/components/profileTemplates.shared';

function makeRow(name: string, standard: boolean): VorgabenBRow {
  return {
    key: 'x',
    rawValue: {},
    value: {
      Name: name,
      beginnB: { tag: 1, zeit: '08:00' },
      endeB: { tag: 1, zeit: '16:00', Nwoche: false },
      nacht: false,
      beginnN: { tag: 1, zeit: '20:00', Nwoche: false },
      endeN: { tag: 1, zeit: '06:00', Nwoche: false },
      standard,
    },
  };
}

describe('normalizeVorgabenBRows', () => {
  it('gibt leeres Array für leere Eingabe zurück', () => {
    expect(normalizeVorgabenBRows([])).toEqual([]);
  });

  it('nummeriert keys ab "1" durch', () => {
    const result = normalizeVorgabenBRows([makeRow('A', false), makeRow('B', false)]);
    expect(result[0]!.key).toBe('1');
    expect(result[1]!.key).toBe('2');
  });

  it('behält vorhandenes standard-Flag an seinem Index', () => {
    const result = normalizeVorgabenBRows([makeRow('A', false), makeRow('B', true)]);
    expect(result[0]!.value.standard).toBe(false);
    expect(result[1]!.value.standard).toBe(true);
  });

  it('setzt Index 0 als Standard wenn kein Row standard: true hat', () => {
    const result = normalizeVorgabenBRows([makeRow('A', false), makeRow('B', false)]);
    expect(result[0]!.value.standard).toBe(true);
    expect(result[1]!.value.standard).toBe(false);
  });

  it('übernimmt preferredStandardIndex und überschreibt vorhandenes standard-Flag', () => {
    const result = normalizeVorgabenBRows([makeRow('A', true), makeRow('B', false), makeRow('C', false)], 2);
    expect(result[0]!.value.standard).toBe(false);
    expect(result[1]!.value.standard).toBe(false);
    expect(result[2]!.value.standard).toBe(true);
  });

  it('fällt auf Index 0 zurück wenn preferredStandardIndex außerhalb des Bereichs', () => {
    const result = normalizeVorgabenBRows([makeRow('A', false), makeRow('B', false)], 99);
    expect(result[0]!.value.standard).toBe(true);
  });

  it('fällt auf Index 0 zurück wenn preferredStandardIndex negativ', () => {
    const result = normalizeVorgabenBRows([makeRow('A', false), makeRow('B', false)], -1);
    expect(result[0]!.value.standard).toBe(true);
  });

  it('stellt sicher dass genau ein Row standard: true hat', () => {
    const rows = [makeRow('A', true), makeRow('B', true), makeRow('C', true)];
    const result = normalizeVorgabenBRows(rows);
    expect(result.filter(r => r.value.standard)).toHaveLength(1);
  });

  it('übernimmt alle anderen Felder unverändert', () => {
    const row = makeRow('TestName', false);
    const [result] = normalizeVorgabenBRows([row]);
    expect(result!.value.Name).toBe('TestName');
    expect(result!.value.nacht).toBe(false);
    expect(result!.rawValue).toEqual({});
  });
});

describe('PERS_FIELDS', () => {
  it('enthält Bundesland als Select-Feld mit Optionen', () => {
    const field = PERS_FIELDS.find(f => f.key === 'Bundesland');
    expect(field?.type).toBe('select');
    expect(Array.isArray(field?.options)).toBe(true);
    expect(field!.options!.length).toBeGreaterThan(1);
  });

  it('enthält kmArbeitsort und kmnBhf als number-Felder', () => {
    expect(PERS_FIELDS.find(f => f.key === 'kmArbeitsort')?.type).toBe('number');
    expect(PERS_FIELDS.find(f => f.key === 'kmnBhf')?.type).toBe('number');
  });

  it('enthält Vorname, Nachname, PNummer', () => {
    const keys = PERS_FIELDS.map(f => f.key);
    expect(keys).toContain('Vorname');
    expect(keys).toContain('Nachname');
    expect(keys).toContain('PNummer');
  });
});

describe('ARBEITSZEIT_FIELDS', () => {
  it('enthält bT (Beginn Tag), eT (Ende Tag), bN, eN', () => {
    const keys = ARBEITSZEIT_FIELDS.map(f => f.key);
    expect(keys).toContain('bT');
    expect(keys).toContain('eT');
    expect(keys).toContain('bN');
    expect(keys).toContain('eN');
  });
});

describe('TAB_OPTIONS', () => {
  it('enthält bereitschaft, ewt und neben', () => {
    const keys = TAB_OPTIONS.map(t => t.key);
    expect(keys).toContain('bereitschaft');
    expect(keys).toContain('ewt');
    expect(keys).toContain('neben');
  });
});

describe('WEEKDAY_OPTIONS', () => {
  it('geht von 1 (Mo) bis 7 (So), exakt 7 Einträge', () => {
    expect(WEEKDAY_OPTIONS).toHaveLength(7);
    expect(WEEKDAY_OPTIONS[0].value).toBe(1);
    expect(WEEKDAY_OPTIONS[0].label).toBe('Mo');
    expect(WEEKDAY_OPTIONS[6].value).toBe(7);
    expect(WEEKDAY_OPTIONS[6].label).toBe('So');
  });
});
