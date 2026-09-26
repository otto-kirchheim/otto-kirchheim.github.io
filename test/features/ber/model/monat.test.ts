import { describe, expect, it } from 'bun:test';
import { getMonatFromBE, getMonatFromBZ } from '@/features/ber/model/monat';
import type { IDatenBE, IDatenBZ } from '@/shared/types';

describe('ber/model/monat', () => {
  describe('getMonatFromBZ', () => {
    it('returns month from ISO date string', () => {
      expect(getMonatFromBZ({ Beginn: '2026-03-10T10:00:00.000Z' } as IDatenBZ)).toBe(3);
    });

    it('returns month from different month', () => {
      expect(getMonatFromBZ({ Beginn: '2026-12-01T00:00:00.000Z' } as IDatenBZ)).toBe(12);
    });
  });

  describe('getMonatFromBE', () => {
    it('parses DD.MM.YYYY format', () => {
      expect(getMonatFromBE({ Tag: '15.06.2026' } as IDatenBE)).toBe(6);
    });
  });
});
