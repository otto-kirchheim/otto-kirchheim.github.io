import { describe, expect, it, vi } from 'bun:test';
import { getNebengeldDaten } from '../src/ts/features/Neben/utils';
import Storage from '../src/ts/infrastructure/storage/Storage';
import type { IDatenN } from '../src/ts/interfaces';

describe('#getNebengeldDaten function', () => {
  it('should return an empty array when no data is provided and there is no data in storage', () => {
    Storage.set('Benutzer', 'test');
    Storage.set('Jahr', 2026);
    const result = getNebengeldDaten(undefined, 3);
    expect(result).toEqual([]);
  });

  it('should return data from storage when no data is provided', () => {
    const storageData: IDatenN[] = [
      {
        tagN: '12',
        beginN: '19:30',
        endeN: '06:15',
        anzahl040N: 1,
        auftragN: '123456789',
      },
      {
        tagN: '13',
        beginN: '19:30',
        endeN: '06:15',
        anzahl040N: 1,
        auftragN: '223456789',
      },
    ];

    vi.spyOn(Storage, 'check').mockImplementation(key => key === 'Benutzer' || key === 'dataN');
    vi.spyOn(Storage, 'get').mockImplementation((key: string) => {
      if (key === 'Jahr') return 2026;
      if (key === 'dataN') return storageData;
      if (key === 'Monat') return 3;
      return undefined;
    });

    const result = getNebengeldDaten(undefined, 3);
    expect(result).toEqual([
      {
        tagN: '12',
        beginN: '19:30',
        endeN: '06:15',
        anzahl040N: 1,
        auftragN: '123456789',
      },
      {
        tagN: '13',
        beginN: '19:30',
        endeN: '06:15',
        anzahl040N: 1,
        auftragN: '223456789',
      },
    ]);

    vi.restoreAllMocks();
  });
});
