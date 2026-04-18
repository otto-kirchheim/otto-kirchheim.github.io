import { afterEach, describe, expect, it, vi } from 'bun:test';
import {
  deriveHolidayRegionFromAddress,
  HOLIDAY_REGION_OPTIONS,
  resolveHolidayRegion,
} from '../../src/ts/infrastructure/date/holidayRegion';

/** Hilfsfunktion: mockt einen erfolgreichen OpenPLZ-API-Aufruf. */
const mockOpenPlz = (federalStateKey: string) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => [{ federalState: { key: federalStateKey } }],
  } as Response);
};

describe('holidayRegion utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the explicitly stored holiday region', () => {
    expect(resolveHolidayRegion({ bundesland: 'BY' })).toBe('BY');
  });

  it('falls back to BUND when no holiday region is stored', () => {
    expect(resolveHolidayRegion({})).toBe('BUND');
    expect(resolveHolidayRegion({ bundesland: undefined })).toBe('BUND');
    expect(resolveHolidayRegion({ bundesland: null })).toBe('BUND');
  });

  it('derives the region from a PLZ via OpenPLZ API', async () => {
    mockOpenPlz('11'); // Berlin
    expect(await deriveHolidayRegionFromAddress('Alexanderplatz 1, 10178 Berlin')).toBe('BE');

    mockOpenPlz('06'); // Hessen
    expect(await deriveHolidayRegionFromAddress('Beiersgraben, 36275 Kirchheim')).toBe('HE');
  });

  it('returns null when address contains no PLZ', async () => {
    expect(await deriveHolidayRegionFromAddress('Unbekannte Adresse')).toBeNull();
  });

  it('returns null when OpenPLZ API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    expect(await deriveHolidayRegionFromAddress('10178 Berlin')).toBeNull();
  });

  it('returns null when OpenPLZ API returns an empty result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);
    expect(await deriveHolidayRegionFromAddress('99999 Unbekannt')).toBeNull();
  });

  it('offers only state options with full display names', () => {
    expect(HOLIDAY_REGION_OPTIONS.some(option => option.value === 'BUND' || option.value === 'ALL')).toBe(false);
    expect(HOLIDAY_REGION_OPTIONS.find(option => option.value === 'HE')).toEqual({ value: 'HE', label: 'Hessen' });
    expect(HOLIDAY_REGION_OPTIONS.find(option => option.value === 'NW')).toEqual({
      value: 'NW',
      label: 'Nordrhein-Westfalen',
    });
  });
});
