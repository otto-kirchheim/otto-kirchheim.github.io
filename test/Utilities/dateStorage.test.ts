import { afterEach, beforeEach, describe, expect, it, setSystemTime, vi } from 'bun:test';

const { storageMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  storageMock: { get: vi.fn() },
}));

vi.mock('../../src/ts/infrastructure/storage/Storage', () => ({ default: storageMock }));

import { getStoredMonatJahr } from '../../src/ts/infrastructure/date/dateStorage';

describe('getStoredMonatJahr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setSystemTime();
  });

  it('gibt gespeicherte Werte zurück wenn Storage befüllt', () => {
    storageMock.get.mockImplementation((_key: string, opts: { default: number }) => {
      if (_key === 'Monat') return 5;
      if (_key === 'Jahr') return 2025;
      return opts.default;
    });

    expect(getStoredMonatJahr()).toEqual({ monat: 5, jahr: 2025 });
  });

  it('gibt aktuellen Monat und Jahr zurück wenn Storage leer', () => {
    setSystemTime(new Date(2024, 6, 15)); // Juli 2024

    storageMock.get.mockImplementation((_key: string, opts: { default: number }) => opts.default);

    const { monat, jahr } = getStoredMonatJahr();
    expect(monat).toBe(7);
    expect(jahr).toBe(2024);
  });
});
