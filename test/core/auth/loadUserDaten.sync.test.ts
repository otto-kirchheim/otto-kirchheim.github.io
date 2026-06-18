import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { getMonatFromBZMock, getMonatFromBEMock, getMonatFromEWTMock, getMonatFromNMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  getMonatFromBZMock: vi.fn(),
  getMonatFromBEMock: vi.fn(),
  getMonatFromEWTMock: vi.fn(),
  getMonatFromNMock: vi.fn(),
}));

vi.mock('@/infrastructure/date/getMonatFromItem', () => ({
  getMonatFromBZ: getMonatFromBZMock,
  getMonatFromBE: getMonatFromBEMock,
  getMonatFromEWT: getMonatFromEWTMock,
  getMonatFromN: getMonatFromNMock,
}));

vi.mock('@/infrastructure/data/normalizeResourceRows', () => ({
  default: (rows: unknown) => (Array.isArray(rows) ? rows : []),
}));

import { syncLoadedYearResources } from '@/core/orchestration/auth/utils/loadUserDaten.sync';
import { default as Storage } from '@/infrastructure/storage/Storage';

const serverTimestamps = {
  VorgabenU: '2020-01-01T00:00:00.000Z',
  dataBZ: '2020-01-01T00:00:00.000Z',
  dataBE: '2020-01-01T00:00:00.000Z',
  dataE: '2020-01-01T00:00:00.000Z',
  dataN: '2020-01-01T00:00:00.000Z',
} as never;

const vorgabenU = { pers: { Vorname: 'Test' } } as never;

describe('syncLoadedYearResources – Bug 2: kein stale dataServer', () => {
  beforeEach(() => {
    Storage.clear();
    getMonatFromBZMock.mockReturnValue(4);
    getMonatFromBEMock.mockReturnValue(4);
    getMonatFromEWTMock.mockReturnValue(4);
    getMonatFromNMock.mockReturnValue(4);
  });

  it('setzt dataServer.X nur für Ressourcen mit echtem Konflikt im aktuellen Load', () => {
    const future = Date.now() + 1_000_000;

    // dataBZ: lokal == server (gleiche Länge) → KEIN Konflikt
    Storage.setWithTimestamp('dataBZ', [{ _id: 'bz1' }], future);
    // dataBE: lokal kürzer als server → Konflikt
    Storage.setWithTimestamp('dataBE', [{ _id: 'be1' }], future);

    const result = syncLoadedYearResources({
      vorgabenU,
      BZ: [{ _id: 'bz1' }] as never,
      BE: [{ _id: 'be1' }, { _id: 'be2' }] as never,
      EWT: [] as never,
      N: [] as never,
      serverTimestamps,
    });

    // Regression-Guard für Bug 2: BZ darf NICHT im dataServer landen,
    // da es keinen BZ-Konflikt gibt und initialDataServer entfernt wurde.
    expect(result.dataServer.BZ).toBeUndefined();
    // BE hat einen echten Konflikt → muss gesetzt sein.
    expect(result.dataServer.BE).toBeDefined();
    expect(result.vorhanden.some(v => v.beschreibung === 'Bereitschaftseinsatz')).toBe(true);
    expect(result.vorhanden.some(v => v.beschreibung === 'Bereitschaftszeit')).toBe(false);
  });
});
