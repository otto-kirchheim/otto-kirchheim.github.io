import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import {
  deriveHolidayRegionFromAddress,
  HOLIDAY_REGION_OPTIONS,
  resolveHolidayRegion,
  setupBundeslandAutoFill,
} from '@/infrastructure/date/holidayRegion';

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

describe('setupBundeslandAutoFill', () => {
  function buildDOM() {
    const addressInput = document.createElement('input');
    addressInput.id = 'ErsteTkgStAdresse';
    const bundeslandSelect = document.createElement('select');
    bundeslandSelect.id = 'Bundesland';
    // Leere Option first so value starts as '' (no auto-select of real values)
    const empty = document.createElement('option');
    empty.value = '';
    bundeslandSelect.appendChild(empty);
    for (const v of ['BE', 'BY', 'HE', 'NW', 'SH']) {
      const opt = document.createElement('option');
      opt.value = v;
      bundeslandSelect.appendChild(opt);
    }
    document.body.appendChild(addressInput);
    document.body.appendChild(bundeslandSelect);
    return { addressInput, bundeslandSelect };
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('gibt sofort zurück wenn addressInput fehlt', () => {
    const bundeslandSelect = document.createElement('select');
    bundeslandSelect.id = 'Bundesland';
    document.body.appendChild(bundeslandSelect);
    expect(() => setupBundeslandAutoFill()).not.toThrow();
  });

  it('gibt sofort zurück wenn bundeslandSelect fehlt', () => {
    const addressInput = document.createElement('input');
    addressInput.id = 'ErsteTkgStAdresse';
    document.body.appendChild(addressInput);
    expect(() => setupBundeslandAutoFill()).not.toThrow();
  });

  it('setzt bundeslandAutoFillBound auf addressInput nach erstem Aufruf', () => {
    const { addressInput } = buildDOM();
    setupBundeslandAutoFill();
    expect(addressInput.dataset.bundeslandAutoFillBound).toBe('true');
  });

  it('verhindert Doppelbindung bei mehrmaligem Aufruf', () => {
    const { addressInput } = buildDOM();
    const spy = vi.spyOn(addressInput, 'addEventListener');
    setupBundeslandAutoFill();
    setupBundeslandAutoFill();
    const blurCalls = spy.mock.calls.filter(([event]) => event === 'blur');
    expect(blurCalls.length).toBe(1);
  });

  it('blur-Event aktualisiert bundesland aus gültiger Adresse', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();
    addressInput.value = 'Hauptstraße 1, 36275 Kirchheim';
    addressInput.dispatchEvent(new Event('blur'));

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('HE');
    expect(bundeslandSelect.dataset.autoFilledValue).toBe('HE');
  });

  it('change-Event aktualisiert bundesland aus gültiger Adresse', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '11' } }],
    } as Response);

    setupBundeslandAutoFill();
    addressInput.value = 'Alexanderplatz 1, 10178 Berlin';
    addressInput.dispatchEvent(new Event('change'));

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('BE');
  });

  it('überschreibt manuelle Auswahl nicht', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    bundeslandSelect.innerHTML = '<option value="BY">Bayern</option><option value="HE">Hessen</option>';
    bundeslandSelect.value = 'BY';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();
    addressInput.value = 'Hauptstraße 1, 36275 Kirchheim';
    addressInput.dispatchEvent(new Event('blur'));

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('BY');
  });

  it('überschreibt auto-gesetzten Wert durch neuen auto-Wert', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    bundeslandSelect.innerHTML = '<option value="BE">Berlin</option><option value="HE">Hessen</option>';
    bundeslandSelect.value = 'BE';
    bundeslandSelect.dataset.autoFilledValue = 'BE';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();
    addressInput.value = 'Hauptstraße 1, 36275 Kirchheim';
    addressInput.dispatchEvent(new Event('blur'));

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('HE');
  });

  it('aktualisiert bundesland sofort wenn kein Wert gesetzt und Adresse gültig', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    addressInput.value = 'Hauptstraße 1, 36275 Kirchheim';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('HE');
  });

  it('aktualisiert bundesland nicht bei ungültiger Adresse', async () => {
    const { addressInput, bundeslandSelect } = buildDOM();
    setupBundeslandAutoFill();

    addressInput.value = 'Keine gültige Adresse';
    addressInput.dispatchEvent(new Event('blur'));

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(bundeslandSelect.value).toBe('');
  });
});
