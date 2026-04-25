import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import Storage from '../src/ts/infrastructure/storage/Storage';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, IVorgabenBerechnung } from '../src/ts/core/types';

// Mock generateTableBerechnung to avoid DOM dependency
vi.mock('../src/ts/features/Berechnung/generateTableBerechnung', () => ({
  default: vi.fn(),
}));

import aktualisiereBerechnung from '../src/ts/features/Berechnung/aktualisiereBerechnung';

describe('aktualisiereBerechnung', () => {
  beforeEach(() => {
    localStorage.clear();
    Storage.set('datenBerechnung', {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns empty Berechnung for empty data', () => {
    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [] });

    expect(result).toBeDefined();
    // Every month should have zero values
    for (let m = 1; m <= 12; m++) {
      const month = result[m as keyof IVorgabenBerechnung];
      expect(month.B.B).toBe(0);
      expect(month.B.L1).toBe(0);
      expect(month.B.L2).toBe(0);
      expect(month.B.L3).toBe(0);
      expect(month.B.K).toBe(0);
      expect(month.E.A8).toBe(0);
      expect(month.E.A14).toBe(0);
      expect(month.E.A24).toBe(0);
      expect(month.E.S8).toBe(0);
      expect(month.E.S14).toBe(0);
      expect(month.N.F).toBe(0);
    }
  });

  it('calculates BZ standby minutes (endeB - beginB + pauseB)', () => {
    const BZ: IDatenBZ[] = [
      {
        beginB: '2026-03-10T10:00:00.000Z',
        endeB: '2026-03-10T18:00:00.000Z',
        pauseB: 30,
      } as IDatenBZ,
    ];

    const result = aktualisiereBerechnung({ BZ, BE: [], EWT: [], N: [] });
    // 8 hours = 480 minutes + 30 pause = 510
    expect(result[3 as keyof IVorgabenBerechnung].B.B).toBe(510);
  });

  it('subtracts BE einsatz time from standby and counts LRE', () => {
    const BZ: IDatenBZ[] = [
      {
        beginB: '2026-03-10T10:00:00.000Z',
        endeB: '2026-03-10T20:00:00.000Z',
        pauseB: 0,
      } as IDatenBZ,
    ];

    const BE: IDatenBE[] = [
      {
        tagBE: '10.03.2026',
        beginBE: '14:00',
        endeBE: '16:00',
        lreBE: 'LRE 1',
        privatkmBE: 25,
      } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ, BE, EWT: [], N: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    // BZ: 600 min, BE: -120 min = 480
    expect(monat3.B.B).toBe(480);
    expect(monat3.B.L1).toBe(1);
    expect(monat3.B.L2).toBe(0);
    expect(monat3.B.L3).toBe(0);
    expect(monat3.B.K).toBe(25);
  });

  it('counts LRE 2 and LRE 3 correctly', () => {
    const BE: IDatenBE[] = [
      { tagBE: '10.03.2026', beginBE: '10:00', endeBE: '11:00', lreBE: 'LRE 2', privatkmBE: 0 } as IDatenBE,
      { tagBE: '11.03.2026', beginBE: '10:00', endeBE: '11:00', lreBE: 'LRE 3', privatkmBE: 10 } as IDatenBE,
      { tagBE: '12.03.2026', beginBE: '10:00', endeBE: '11:00', lreBE: 'LRE 3', privatkmBE: 5 } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE, EWT: [], N: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.B.L2).toBe(1);
    expect(monat3.B.L3).toBe(2);
    expect(monat3.B.K).toBe(15);
  });

  it('calculates EWT absence buckets (A8/A14/A24)', () => {
    const EWT: IDatenEWT[] = [
      // 9 hours → A8
      { tagE: '2026-03-01', buchungstagE: '2026-03-01', abWE: '08:00', anWE: '17:00' } as IDatenEWT,
      // 15 hours → A14
      { tagE: '2026-03-02', buchungstagE: '2026-03-02', abWE: '06:00', anWE: '21:00' } as IDatenEWT,
      // 23 hours (overnight, anWE < abWE) → A14 (>= 14 and < 24)
      { tagE: '2026-03-03', buchungstagE: '2026-03-03', abWE: '06:00', anWE: '05:00' } as IDatenEWT,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT, N: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.E.A8).toBe(1);
    expect(monat3.E.A14).toBe(2);
    expect(monat3.E.A24).toBe(0);
  });

  it('calculates EWT Schichtarbeit buckets (S8/S14)', () => {
    const EWT: IDatenEWT[] = [
      // 10 hours → S8
      { tagE: '2026-03-01', buchungstagE: '2026-03-01', ab1E: '08:00', an1E: '18:00' } as IDatenEWT,
      // 22 hours (overnight, an1E < ab1E → +1 day) → S14 (>= 24? 22 < 24 → S8)
      { tagE: '2026-03-02', buchungstagE: '2026-03-02', ab1E: '06:00', an1E: '04:00' } as IDatenEWT,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT, N: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.E.S8).toBe(2);
    expect(monat3.E.S14).toBe(0);
  });

  it('counts N entries per month as N.F', () => {
    const N: IDatenN[] = [
      { tagN: '01.03.2026' } as IDatenN,
      { tagN: '15.03.2026' } as IDatenN,
      { tagN: '01.04.2026' } as IDatenN,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N });
    expect(result[3 as keyof IVorgabenBerechnung].N.F).toBe(2);
    expect(result[4 as keyof IVorgabenBerechnung].N.F).toBe(1);
  });

  it('stores result in Storage', () => {
    aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [] });
    const stored = Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true });
    expect(stored).toBeDefined();
    expect(stored[1 as keyof IVorgabenBerechnung]).toBeDefined();
  });

  it('reads from Storage when no daten argument provided', () => {
    Storage.set('dataBZ', []);
    Storage.set('dataBE', []);
    Storage.set('dataE', []);
    Storage.set('dataN', [{ tagN: '05.06.2026' } as IDatenN]);
    Storage.set('datenBerechnung', {});

    const result = aktualisiereBerechnung();
    expect(result[6 as keyof IVorgabenBerechnung].N.F).toBe(1);
  });

  it('handles BE with overnight endeBE (before beginBE)', () => {
    const BE: IDatenBE[] = [
      {
        tagBE: '10.03.2026',
        beginBE: '22:00',
        endeBE: '02:00',
        lreBE: 'LRE 1',
        privatkmBE: 0,
      } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE, EWT: [], N: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    // 22:00 - 02:00 next day = 4 hours = 240 min subtracted
    expect(monat3.B.B).toBe(-240);
    expect(monat3.B.L1).toBe(1);
  });

  it('handles nested data format (month-keyed objects)', () => {
    const BZ = { '3': [{ beginB: '2026-03-10T08:00:00.000Z', endeB: '2026-03-10T16:00:00.000Z', pauseB: 0 }] };

    const result = aktualisiereBerechnung({ BZ: BZ as unknown as IDatenBZ[], BE: [], EWT: [], N: [] });
    // normalizeResourceRows should flatten month-keyed objects
    expect(result[3 as keyof IVorgabenBerechnung].B.B).toBe(480);
  });
});
