import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getMonatFromN } from '@/features/ez/model/monat';
import Storage from '@/shared/lib/storage/Storage';
import type { IDatenN } from '@/shared/types';

describe('ez/model/monat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getMonatFromN', () => {
    it('parses DD.MM.YYYY format', () => {
      expect(getMonatFromN({ Tag: '01.03.2026' } as IDatenN)).toBe(3);
    });

    it('falls back to Storage Monat for bare digit', () => {
      Storage.set('Monat', 7);
      expect(getMonatFromN({ Tag: '15' } as IDatenN)).toBe(7);
    });

    it('falls back to dayjs parse for other formats', () => {
      expect(getMonatFromN({ Tag: '2026-08-15' } as IDatenN)).toBe(8);
    });
  });
});
