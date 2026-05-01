import { describe, expect, it } from 'bun:test';
import normalizeResourceRows from '@/infrastructure/data/normalizeResourceRows';

describe('normalizeResourceRows', () => {
  it('returns an array as-is', () => {
    const input = [{ a: 1 }, { a: 2 }];
    expect(normalizeResourceRows(input)).toEqual(input);
  });

  it('flattens a month-keyed object of arrays', () => {
    const input = { '3': [{ a: 1 }], '4': [{ a: 2 }] };
    expect(normalizeResourceRows(input)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('filters out non-array object values', () => {
    const input = { a: 'string', b: 42, c: [{ x: 1 }] };
    expect(normalizeResourceRows(input)).toEqual([{ x: 1 }]);
  });

  it('returns empty array for null', () => {
    expect(normalizeResourceRows(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeResourceRows(undefined)).toEqual([]);
  });

  it('returns empty array for a number', () => {
    expect(normalizeResourceRows(42)).toEqual([]);
  });

  it('returns empty array for a string', () => {
    expect(normalizeResourceRows('hello')).toEqual([]);
  });

  it('returns empty array for empty object', () => {
    expect(normalizeResourceRows({})).toEqual([]);
  });
});
