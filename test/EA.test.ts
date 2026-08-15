import { describe, expect, it, vi } from 'bun:test';
import { getEaDaten } from '@/features/EA/utils';
import Storage from '@/infrastructure/storage/Storage';
import type { IDatenEA } from '@/core/types';

describe('#getEaDaten function', () => {
  it('should return an empty array when no data is provided and there is no data in storage', () => {
    vi.spyOn(Storage, 'check').mockImplementation(key => key === 'Benutzer' || key === 'dataEA');
    vi.spyOn(Storage, 'get').mockImplementation((key: string) => {
      if (key === 'Jahr') return 2026;
      if (key === 'dataEA') return [];
      return undefined;
    });

    const result = getEaDaten(undefined, 3);
    expect(result).toEqual([]);

    vi.restoreAllMocks();
  });

  it('should return data from storage when no data is provided', () => {
    const storageData: IDatenEA[] = [
      {
        Tag: '12.03.2026',
        Dauer: '02:00',
        Taetigkeit: 'Signalmechaniker RBEG',
        Entgeltgruppe: '105',
      },
      {
        Tag: '13.03.2026',
        Dauer: '01:30',
        Taetigkeit: 'Signalmechaniker RBEG',
        Entgeltgruppe: '105',
      },
    ];

    vi.spyOn(Storage, 'check').mockImplementation(key => key === 'Benutzer' || key === 'dataEA');
    vi.spyOn(Storage, 'get').mockImplementation((key: string) => {
      if (key === 'Jahr') return 2026;
      if (key === 'dataEA') return storageData;
      if (key === 'Monat') return 3;
      return undefined;
    });

    const result = getEaDaten(undefined, 3);
    expect(result).toEqual(storageData);

    vi.restoreAllMocks();
  });

  it('should return an empty array for years before 2025 (backend enforces Jahr >= 2025)', () => {
    vi.spyOn(Storage, 'check').mockImplementation(key => key === 'Benutzer' || key === 'dataEA');
    vi.spyOn(Storage, 'get').mockImplementation((key: string) => {
      if (key === 'Jahr') return 2024;
      if (key === 'dataEA') return [{ Tag: '12.03.2024', Dauer: '02:00', Taetigkeit: '', Entgeltgruppe: '' }];
      return undefined;
    });

    const result = getEaDaten(undefined, 3);
    expect(result).toEqual([]);

    vi.restoreAllMocks();
  });

  it('should return an empty array when no user is logged in', () => {
    vi.spyOn(Storage, 'check').mockImplementation(() => false);

    const result = getEaDaten(undefined, 3);
    expect(result).toEqual([]);

    vi.restoreAllMocks();
  });
});
