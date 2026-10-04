import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  getMonatFromEWT,
  getMonatFromEWTBuchungstag,
  isEwtInMonat,
  filterByMonat,
} from '@/shared/lib/date/getMonatFromItem';
import type { IDatenEWT } from '@/shared/types';

describe('getMonatFromItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getMonatFromEWT', () => {
    it('parses YYYY-MM-DD format from Tag', () => {
      expect(getMonatFromEWT({ Tag: '2026-04-15' } as IDatenEWT)).toBe(4);
    });
  });

  describe('getMonatFromEWTBuchungstag', () => {
    it('uses Buchungstag when available', () => {
      expect(getMonatFromEWTBuchungstag({ Tag: '2026-03-31', Buchungstag: '2026-04-01' } as IDatenEWT)).toBe(4);
    });

    it('falls back to Tag when Buchungstag is empty', () => {
      expect(getMonatFromEWTBuchungstag({ Tag: '2026-05-15', Buchungstag: '' } as IDatenEWT)).toBe(5);
    });
  });

  describe('isEwtInMonat', () => {
    const ewt = { Tag: '2026-03-31', Buchungstag: '2026-04-01' } as IDatenEWT;

    it('mode starttag: checks Tag only', () => {
      expect(isEwtInMonat(ewt, 3, 'starttag')).toBe(true);
      expect(isEwtInMonat(ewt, 4, 'starttag')).toBe(false);
    });

    it('mode buchungstag: checks Buchungstag only', () => {
      expect(isEwtInMonat(ewt, 4, 'buchungstag')).toBe(true);
      expect(isEwtInMonat(ewt, 3, 'buchungstag')).toBe(false);
    });

    it('mode beide (default): checks both', () => {
      expect(isEwtInMonat(ewt, 3)).toBe(true);
      expect(isEwtInMonat(ewt, 4)).toBe(true);
      expect(isEwtInMonat(ewt, 5)).toBe(false);
    });
  });

  describe('filterByMonat', () => {
    it('filters items matching given month', () => {
      const items = [
        { Tag: '2026-03-01' } as IDatenEWT,
        { Tag: '2026-04-01' } as IDatenEWT,
        { Tag: '2026-03-15' } as IDatenEWT,
      ];
      const result = filterByMonat(items, 3, getMonatFromEWT);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no match', () => {
      const result = filterByMonat([{ Tag: '2026-01-01' } as IDatenEWT], 5, getMonatFromEWT);
      expect(result).toEqual([]);
    });
  });
});
