import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { getMonatFromBZMock, getMonatFromBEMock, getMonatFromEWTMock, getMonatFromNMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  getMonatFromBZMock: vi.fn(),
  getMonatFromBEMock: vi.fn(),
  getMonatFromEWTMock: vi.fn(),
  getMonatFromNMock: vi.fn(),
}));

vi.mock('@/shared/lib/date/getMonatFromItem', () => ({ getMonatFromEWT: getMonatFromEWTMock }));
vi.mock('@/features/ber/model/monat', () => ({
  getMonatFromBZ: getMonatFromBZMock,
  getMonatFromBE: getMonatFromBEMock,
}));
vi.mock('@/features/ez/model/monat', () => ({ getMonatFromN: getMonatFromNMock }));

vi.mock('@/shared/lib/ressource/normalizeResourceRows', () => ({
  default: (rows: unknown) => (Array.isArray(rows) ? rows : []),
}));

import '@/app/features';
import { syncLoadedYearResources } from '@/app/session/loadUserDaten.sync';
import { default as Storage } from '@/shared/lib/storage/Storage';

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
      resources: {
        BZ: [{ _id: 'bz1' }] as never,
        BE: [{ _id: 'be1' }, { _id: 'be2' }] as never,
        EWT: [] as never,
        N: [] as never,
        EA: [] as never,
      },
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
      resources: { BZ: [{ _id: 'bz1' }] as never, BE: [] as never, EWT: [] as never, N: [] as never, EA: [] as never },
      serverTimestamps,
    });

    expect(result.vorhanden).toHaveLength(0);
    expect(Object.keys(result.dataServer)).toHaveLength(0);
    // Lokale Daten inkl. Pending-New-Row bleiben erhalten und landen im Tabellen-Load
    expect(result.rows.BZ).toHaveLength(2);
  });

  it('meldet keinen Konflikt für lokale Pending-New-Rows mit explizitem __localState-Marker', () => {
    const future = Date.now() + 1_000_000;

    Storage.setWithTimestamp('dataBZ', [{ _id: 'bz1' }, { Beginn: '2026-07-01', __localState: 'new' }], future);

    const result = syncLoadedYearResources({
      vorgabenU,
      resources: { BZ: [{ _id: 'bz1' }] as never, BE: [] as never, EWT: [] as never, N: [] as never, EA: [] as never },
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
      resources: {
        BZ: [{ _id: 'bz1', bz: 'server-stand' }] as never,
        BE: [] as never,
        EWT: [] as never,
        N: [] as never,
        EA: [] as never,
      },
      serverTimestamps: {
        VorgabenU: '2020-01-01T00:00:00.000Z',
        dataBZ: new Date(Date.now() + 1_000_000).toISOString(),
        dataBE: '2020-01-01T00:00:00.000Z',
        dataE: '2020-01-01T00:00:00.000Z',
        dataN: '2020-01-01T00:00:00.000Z',
      } as never,
    });

    // Lokale (geänderte) Daten bleiben erhalten statt vom neueren Server-Stand überschrieben zu werden
    expect(((result.rows.BZ as unknown[])[0] as unknown as { bz: string }).bz).toBe('lokal-geaendert');
  });

  it('heilt unveränderte lokale Zeilen gegen neueren Serverinhalt, wenn eine andere Zeile derselben Ressource noch ungesynct ist', () => {
    const past = Date.now() - 1_000_000;
    const future = Date.now() + 1_000_000;

    // bz1: keine eigene Änderung, aber auf einem anderen Gerät inzwischen geändert (Server neuer).
    // bz2: ungesynchte Neuanlage auf diesem Gerät -- verhindert das Komplett-Überschreiben durch den
    // Server und zwingt den Ablauf in den Heal-Pfad statt in den "Server gewinnt ganz"-Zweig.
    Storage.setWithTimestamp(
      'dataBZ',
      [
        { _id: 'bz1', bz: 'alt-lokal', __localState: 'unchanged' },
        { bz: 'neu-lokal', __localState: 'new' },
      ],
      past,
    );

    const result = syncLoadedYearResources({
      vorgabenU,
      resources: {
        BZ: [{ _id: 'bz1', bz: 'neu-server' }] as never,
        BE: [] as never,
        EWT: [] as never,
        N: [] as never,
        EA: [] as never,
      },
      serverTimestamps: {
        VorgabenU: '2020-01-01T00:00:00.000Z',
        dataBZ: new Date(future).toISOString(),
        dataBE: '2020-01-01T00:00:00.000Z',
        dataE: '2020-01-01T00:00:00.000Z',
        dataN: '2020-01-01T00:00:00.000Z',
      } as never,
    });

    const rows = result.rows.BZ as unknown as { _id?: string; bz: string; __localState: string }[];
    const healed = rows.find(row => row._id === 'bz1');
    const pendingNew = rows.find(row => row.bz === 'neu-lokal');

    // bz1 wurde ohne Rückfrage auf den Serverinhalt angehoben -- dieses Gerät hatte an der Zeile
    // selbst nichts offen.
    expect(healed?.bz).toBe('neu-server');
    expect(healed?.__localState).toBe('unchanged');
    // Die ungesynchte Neuanlage bleibt unberührt und löst keinen falschen Konflikt aus (gleiche
    // effektive Zeilenanzahl: countByMonth zählt Pending-New-Rows nicht mit).
    expect(pendingNew).toBeDefined();
    expect(result.vorhanden).toHaveLength(0);

    // Heilung wird auch im Storage persistiert, nicht nur im Rückgabewert.
    const stored = Storage.get<{ _id?: string; bz: string }[]>('dataBZ', { check: true });
    expect(stored.find(row => row._id === 'bz1')?.bz).toBe('neu-server');
  });

  it('lässt eine lokal geänderte Zeile unberührt, auch wenn eine andere unveränderte Zeile derselben Ressource geheilt wird', () => {
    const past = Date.now() - 1_000_000;
    const future = Date.now() + 1_000_000;

    Storage.setWithTimestamp(
      'dataBZ',
      [
        { _id: 'bz1', bz: 'alt-lokal', __localState: 'unchanged' },
        { _id: 'bz2', bz: 'lokal-geaendert', __localState: 'modified' },
      ],
      past,
    );

    const result = syncLoadedYearResources({
      vorgabenU,
      resources: {
        BZ: [
          { _id: 'bz1', bz: 'neu-server' },
          { _id: 'bz2', bz: 'server-stand' },
        ] as never,
        BE: [] as never,
        EWT: [] as never,
        N: [] as never,
        EA: [] as never,
      },
      serverTimestamps: {
        VorgabenU: '2020-01-01T00:00:00.000Z',
        dataBZ: new Date(future).toISOString(),
        dataBE: '2020-01-01T00:00:00.000Z',
        dataE: '2020-01-01T00:00:00.000Z',
        dataN: '2020-01-01T00:00:00.000Z',
      } as never,
    });

    const rows = result.rows.BZ as unknown as { _id: string; bz: string }[];
    expect(rows.find(row => row._id === 'bz1')?.bz).toBe('neu-server');
    // Eigene offene Änderung bleibt unangetastet -- echter Konflikt, keine automatische Heilung.
    expect(rows.find(row => row._id === 'bz2')?.bz).toBe('lokal-geaendert');
  });
});
