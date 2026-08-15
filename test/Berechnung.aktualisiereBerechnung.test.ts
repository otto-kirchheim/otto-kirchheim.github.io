import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import Storage from '@/infrastructure/storage/Storage';
import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN, IVorgabenBerechnung } from '@/core/types';

// Mock generateTableBerechnung to avoid DOM dependency
vi.mock('@/features/Berechnung/generateTableBerechnung', () => ({
  default: vi.fn(),
}));

import aktualisiereBerechnung from '@/features/Berechnung/aktualisiereBerechnung';

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
    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [], EA: [] });

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
      expect(month.N.A).toBe(0);
      expect(month.N.B).toBe(0);
      expect(month.N.C).toBe(0);
      expect(month.N.CA).toBe(0);
      expect(month.N.CB).toBe(0);
      expect(month.N.C9).toBe(0);
      expect(month.N.SIPO).toBe(0);
    }
  });

  it('calculates BZ standby minutes (Ende - Beginn + Pause)', () => {
    const BZ: IDatenBZ[] = [
      {
        Beginn: '2026-03-10T10:00:00.000Z',
        Ende: '2026-03-10T18:00:00.000Z',
        Pause: 30,
      } as IDatenBZ,
    ];

    const result = aktualisiereBerechnung({ BZ, BE: [], EWT: [], N: [], EA: [] });
    // 8 hours = 480 minutes + 30 pause = 510
    expect(result[3 as keyof IVorgabenBerechnung].B.B).toBe(510);
  });

  it('subtracts BE einsatz time from standby and counts LRE', () => {
    const BZ: IDatenBZ[] = [
      {
        Beginn: '2026-03-10T10:00:00.000Z',
        Ende: '2026-03-10T20:00:00.000Z',
        Pause: 0,
      } as IDatenBZ,
    ];

    const BE: IDatenBE[] = [
      {
        Tag: '10.03.2026',
        Beginn: '14:00',
        Ende: '16:00',
        LRE: 'LRE 1',
        PrivatKm: 25,
      } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ, BE, EWT: [], N: [], EA: [] });
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
      { Tag: '10.03.2026', Beginn: '10:00', Ende: '11:00', LRE: 'LRE 2', PrivatKm: 0 } as IDatenBE,
      { Tag: '11.03.2026', Beginn: '10:00', Ende: '11:00', LRE: 'LRE 3', PrivatKm: 10 } as IDatenBE,
      { Tag: '12.03.2026', Beginn: '10:00', Ende: '11:00', LRE: 'LRE 3', PrivatKm: 5 } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE, EWT: [], N: [], EA: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.B.L2).toBe(1);
    expect(monat3.B.L3).toBe(2);
    expect(monat3.B.K).toBe(15);
  });

  it('calculates EWT absence buckets (A8/A14/A24)', () => {
    const EWT: IDatenEWT[] = [
      // 9 hours → A8
      { Tag: '2026-03-01', Buchungstag: '2026-03-01', abWE: '08:00', anWE: '17:00' } as IDatenEWT,
      // 15 hours → A14
      { Tag: '2026-03-02', Buchungstag: '2026-03-02', abWE: '06:00', anWE: '21:00' } as IDatenEWT,
      // 23 hours (overnight, anWE < abWE) → A14 (>= 14 and < 24)
      { Tag: '2026-03-03', Buchungstag: '2026-03-03', abWE: '06:00', anWE: '05:00' } as IDatenEWT,
      // 5 hours → zählt in KEINEM Bucket (früherer Bug: landete via else in A24)
      { Tag: '2026-03-04', Buchungstag: '2026-03-04', abWE: '08:00', anWE: '13:00' } as IDatenEWT,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT, N: [], EA: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.E.A8).toBe(1);
    expect(monat3.E.A14).toBe(2);
    expect(monat3.E.A24).toBe(0);
  });

  it('calculates EWT Schichtarbeit buckets (S8/S14)', () => {
    const EWT: IDatenEWT[] = [
      // 10 hours → S8
      { Tag: '2026-03-01', Buchungstag: '2026-03-01', ab1E: '08:00', an1E: '18:00' } as IDatenEWT,
      // 22 hours (overnight, an1E < ab1E → +1 day) → S14 (>= 24? 22 < 24 → S8)
      { Tag: '2026-03-02', Buchungstag: '2026-03-02', ab1E: '06:00', an1E: '04:00' } as IDatenEWT,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT, N: [], EA: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    expect(monat3.E.S8).toBe(2);
    expect(monat3.E.S14).toBe(0);
  });

  it('sums Zulage-040-Werte je Monat als N.F', () => {
    const N: IDatenN[] = [
      { Tag: '01.03.2026', Zulagen: [{ Typ: '040', Wert: 1 }] } as IDatenN,
      {
        Tag: '15.03.2026',
        Zulagen: [
          { Typ: '040', Wert: 1 },
          { Typ: '811', Wert: 120 },
        ],
      } as IDatenN,
      { Tag: '01.04.2026', Zulagen: [{ Typ: '040', Wert: 1 }] } as IDatenN,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N, EA: [] });
    expect(result[3 as keyof IVorgabenBerechnung].N.F).toBe(2);
    expect(result[4 as keyof IVorgabenBerechnung].N.F).toBe(1);
  });

  it('ignoriert Einträge ohne Zulage 040 in N.F', () => {
    const N: IDatenN[] = [
      { Tag: '01.03.2026', Zulagen: [{ Typ: '811', Wert: 120 }] } as IDatenN,
      { Tag: '15.03.2026', Zulagen: [{ Typ: '040', Wert: 1 }] } as IDatenN,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N, EA: [] });
    expect(result[3 as keyof IVorgabenBerechnung].N.F).toBe(1);
  });

  it('aggregiert alle Zulagen-Typen in die richtigen N-Felder', () => {
    const N: IDatenN[] = [
      {
        Tag: '01.03.2026',
        Zulagen: [
          { Typ: '040', Wert: 1 }, // → N.F
          { Typ: '811', Wert: 120 }, // → N.B (Minuten)
          { Typ: '841', Wert: 90 }, // → N.A (Minuten)
          { Typ: '831', Wert: 60 }, // → N.C (Minuten)
          { Typ: '837', Wert: 60 }, // → N.CA (Minuten)
          { Typ: '838', Wert: 60 }, // → N.CB (Minuten)
          { Typ: '839', Wert: 1 }, // → N.C9 (Stück)
          { Typ: '846', Wert: 60 }, // → N.SIPO (Minuten)
        ],
      } as IDatenN,
    ];
    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N, EA: [] });
    const m3 = result[3 as keyof IVorgabenBerechnung].N;
    expect(m3.F).toBe(1);
    expect(m3.B).toBe(120);
    expect(m3.A).toBe(90);
    expect(m3.C).toBe(60);
    expect(m3.CA).toBe(60);
    expect(m3.CB).toBe(60);
    expect(m3.C9).toBe(1);
    expect(m3.SIPO).toBe(60);
  });

  it('stores result in Storage', () => {
    aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [], EA: [] });
    const stored = Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true });
    expect(stored).toBeDefined();
    expect(stored[1 as keyof IVorgabenBerechnung]).toBeDefined();
  });

  it('reads from Storage when no daten argument provided', () => {
    Storage.set('dataBZ', []);
    Storage.set('dataBE', []);
    Storage.set('dataE', []);
    Storage.set('dataN', [{ Tag: '05.06.2026', Zulagen: [{ Typ: '040', Wert: 1 }] } as IDatenN]);
    Storage.set('datenBerechnung', {});

    const result = aktualisiereBerechnung();
    expect(result[6 as keyof IVorgabenBerechnung].N.F).toBe(1);
  });

  it('handles BE with overnight Ende (before Beginn)', () => {
    const BE: IDatenBE[] = [
      {
        Tag: '10.03.2026',
        Beginn: '22:00',
        Ende: '02:00',
        LRE: 'LRE 1',
        PrivatKm: 0,
      } as IDatenBE,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE, EWT: [], N: [], EA: [] });
    const monat3 = result[3 as keyof IVorgabenBerechnung];
    // 22:00 - 02:00 next day = 4 hours = 240 min subtracted
    expect(monat3.B.B).toBe(-240);
    expect(monat3.B.L1).toBe(1);
  });

  it('sums EA-Dauer je Monat in Minuten (EA.Minuten)', () => {
    const EA: IDatenEA[] = [
      { Tag: '01.03.2026', Dauer: '02:00', Taetigkeit: 'Signalmechaniker', Entgeltgruppe: '105' } as IDatenEA,
      { Tag: '15.03.2026', Dauer: '01:30', Taetigkeit: 'Signalmechaniker', Entgeltgruppe: '105' } as IDatenEA,
      { Tag: '01.04.2026', Dauer: '00:45', Taetigkeit: 'Signalmechaniker', Entgeltgruppe: '105' } as IDatenEA,
    ];

    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [], EA });
    expect(result[3 as keyof IVorgabenBerechnung].EA.Minuten).toBe(210); // 120 + 90
    expect(result[4 as keyof IVorgabenBerechnung].EA.Minuten).toBe(45);
  });

  it('EA.Minuten bleibt 0 ohne EA-Daten', () => {
    const result = aktualisiereBerechnung({ BZ: [], BE: [], EWT: [], N: [], EA: [] });
    for (let m = 1; m <= 12; m++) {
      expect(result[m as keyof IVorgabenBerechnung].EA.Minuten).toBe(0);
    }
  });

  it('handles nested data format (month-keyed objects)', () => {
    const BZ = { '3': [{ Beginn: '2026-03-10T08:00:00.000Z', Ende: '2026-03-10T16:00:00.000Z', Pause: 0 }] };

    const result = aktualisiereBerechnung({ BZ: BZ as unknown as IDatenBZ[], BE: [], EWT: [], N: [], EA: [] });
    // normalizeResourceRows should flatten month-keyed objects
    expect(result[3 as keyof IVorgabenBerechnung].B.B).toBe(480);
  });
});
