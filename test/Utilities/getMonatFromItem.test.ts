import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  getMonatFromBZ,
  getMonatFromBE,
  getMonatFromEWT,
  getMonatFromEWTBuchungstag,
  isEwtInMonat,
  getMonatFromN,
  filterByMonat,
} from '@/infrastructure/date/getMonatFromItem';
import type { IDatenBZ, IDatenBE, IDatenEWT, IDatenN } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage';

describe('getMonatFromItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getMonatFromBZ', () => {
    it('returns month from ISO date string', () => {
      expect(getMonatFromBZ({ beginB: '2026-03-10T10:00:00.000Z' } as IDatenBZ)).toBe(3);
    });

    it('returns month from different month', () => {
      expect(getMonatFromBZ({ beginB: '2026-12-01T00:00:00.000Z' } as IDatenBZ)).toBe(12);
    });
  });

  describe('getMonatFromBE', () => {
    it('parses DD.MM.YYYY format', () => {
      expect(getMonatFromBE({ tagBE: '15.06.2026' } as IDatenBE)).toBe(6);
    });
  });

  describe('getMonatFromEWT', () => {
    it('parses YYYY-MM-DD format from tagE', () => {
      expect(getMonatFromEWT({ tagE: '2026-04-15' } as IDatenEWT)).toBe(4);
    });
  });

  describe('getMonatFromEWTBuchungstag', () => {
    it('uses buchungstagE when available', () => {
      expect(getMonatFromEWTBuchungstag({ tagE: '2026-03-31', buchungstagE: '2026-04-01' } as IDatenEWT)).toBe(4);
    });

    it('falls back to tagE when buchungstagE is empty', () => {
      expect(getMonatFromEWTBuchungstag({ tagE: '2026-05-15', buchungstagE: '' } as IDatenEWT)).toBe(5);
    });
  });

  describe('isEwtInMonat', () => {
    const ewt = { tagE: '2026-03-31', buchungstagE: '2026-04-01' } as IDatenEWT;

    it('mode starttag: checks tagE only', () => {
      expect(isEwtInMonat(ewt, 3, 'starttag')).toBe(true);
      expect(isEwtInMonat(ewt, 4, 'starttag')).toBe(false);
    });

    it('mode buchungstag: checks buchungstagE only', () => {
      expect(isEwtInMonat(ewt, 4, 'buchungstag')).toBe(true);
      expect(isEwtInMonat(ewt, 3, 'buchungstag')).toBe(false);
    });

    it('mode beide (default): checks both', () => {
      expect(isEwtInMonat(ewt, 3)).toBe(true);
      expect(isEwtInMonat(ewt, 4)).toBe(true);
      expect(isEwtInMonat(ewt, 5)).toBe(false);
    });
  });

  describe('getMonatFromN', () => {
    it('parses DD.MM.YYYY format', () => {
      expect(getMonatFromN({ tagN: '01.03.2026' } as IDatenN)).toBe(3);
    });

    it('falls back to Storage Monat for bare digit', () => {
      Storage.set('Monat', 7);
      expect(getMonatFromN({ tagN: '15' } as IDatenN)).toBe(7);
    });

    it('falls back to dayjs parse for other formats', () => {
      expect(getMonatFromN({ tagN: '2026-08-15' } as IDatenN)).toBe(8);
    });
  });

  describe('filterByMonat', () => {
    it('filters items matching given month', () => {
      const items = [
        { tagE: '2026-03-01' } as IDatenEWT,
        { tagE: '2026-04-01' } as IDatenEWT,
        { tagE: '2026-03-15' } as IDatenEWT,
      ];
      const result = filterByMonat(items, 3, getMonatFromEWT);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no match', () => {
      const result = filterByMonat([{ tagE: '2026-01-01' } as IDatenEWT], 5, getMonatFromEWT);
      expect(result).toEqual([]);
    });
  });
});
