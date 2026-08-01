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

  it('meldet keinen Konflikt für lokale Pending-New-Rows ohne _id (AutoSave-Timer nie gefeuert)', () => {
    const future = Date.now() + 1_000_000;

    // Lokal: Server-Row + neue Zeile ohne _id (Fenster wurde vor Ablauf des AutoSave-Timers geschlossen)
    Storage.setWithTimestamp('dataBZ', [{ _id: 'bz1' }, { Beginn: '2026-07-01' }], future);

    const result = syncLoadedYearResources({
      vorgabenU,
      BZ: [{ _id: 'bz1' }] as never,
      BE: [] as never,
      EWT: [] as never,
      N: [] as never,
      serverTimestamps,
    });

    expect(result.vorhanden).toHaveLength(0);
    expect(Object.keys(result.dataServer)).toHaveLength(0);
    // Lokale Daten inkl. Pending-New-Row bleiben erhalten und landen im Tabellen-Load
    expect(result.BZ).toHaveLength(2);
  });

  it('meldet keinen Konflikt für lokale Pending-New-Rows mit explizitem __localState-Marker', () => {
    const future = Date.now() + 1_000_000;

    Storage.setWithTimestamp('dataBZ', [{ _id: 'bz1' }, { Beginn: '2026-07-01', __localState: 'new' }], future);

    const result = syncLoadedYearResources({
      vorgabenU,
      BZ: [{ _id: 'bz1' }] as never,
      BE: [] as never,
      EWT: [] as never,
      N: [] as never,
      serverTimestamps,
    });

    expect(result.vorhanden).toHaveLength(0);
    expect(Object.keys(result.dataServer)).toHaveLength(0);
  });

  it('überschreibt lokale Pending-Modified-Rows nicht mit neuerem Server-Stand', () => {
    const past = Date.now() - 1_000_000;

    // Lokal älter als Server, aber mit ungesendeter Änderung markiert (__localState: 'modified')
    Storage.setWithTimestamp('dataBZ', [{ _id: 'bz1', bz: 'lokal-geaendert', __localState: 'modified' }], past);

    const result = syncLoadedYearResources({
      vorgabenU,
      BZ: [{ _id: 'bz1', bz: 'server-stand' }] as never,
      BE: [] as never,
      EWT: [] as never,
      N: [] as never,
      serverTimestamps: {
        VorgabenU: '2020-01-01T00:00:00.000Z',
        dataBZ: new Date(Date.now() + 1_000_000).toISOString(),
        dataBE: '2020-01-01T00:00:00.000Z',
        dataE: '2020-01-01T00:00:00.000Z',
        dataN: '2020-01-01T00:00:00.000Z',
      } as never,
    });

    // Lokale (geänderte) Daten bleiben erhalten statt vom neueren Server-Stand überschrieben zu werden
    expect((result.BZ[0] as unknown as { bz: string }).bz).toBe('lokal-geaendert');
  });
});
