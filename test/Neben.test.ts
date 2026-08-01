import { describe, expect, it, vi } from 'bun:test';
import { getNebengeldDaten } from '@/features/Neben/utils';
import Storage from '@/infrastructure/storage/Storage';
import type { IDatenN } from '@/core/types';

describe('#getNebengeldDaten function', () => {
  it('should return an empty array when no data is provided and there is no data in storage', () => {
    vi.spyOn(Storage, 'check').mockImplementation(key => key === 'Benutzer' || key === 'dataN');
    vi.spyOn(Storage, 'get').mockImplementation((key: string) => {
      if (key === 'Jahr') return 2026;
      if (key === 'dataN') return [];
      return undefined;
    });

    const result = getNebengeldDaten(undefined, 3);
    expect(result).toEqual([]);

    vi.restoreAllMocks();
  });

  it('should return data from storage when no data is provided', () => {
    const storageData: IDatenN[] = [
      {
        Tag: '12',
        Beginn: '19:30',
        Ende: '06:15',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        Auftragsnummer: '123456789',
      },
      {
        Tag: '13',
        Beginn: '19:30',
        Ende: '06:15',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        Auftragsnummer: '223456789',
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
        Tag: '12',
        Beginn: '19:30',
        Ende: '06:15',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        zulagenAnzeigeN: '040 Fahrentsch. × 1',
        Auftragsnummer: '123456789',
      },
      {
        Tag: '13',
        Beginn: '19:30',
        Ende: '06:15',
        Zulagen: [{ Typ: '040', Wert: 1 }],
        zulagenAnzeigeN: '040 Fahrentsch. × 1',
        Auftragsnummer: '223456789',
      },
    ]);

    vi.restoreAllMocks();
  });
});
