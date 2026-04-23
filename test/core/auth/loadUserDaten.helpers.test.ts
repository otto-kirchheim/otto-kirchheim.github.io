import { describe, expect, it, vi } from 'bun:test';

const { getMonatFromBZMock, getMonatFromBEMock, getMonatFromEWTMock, getMonatFromNMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  getMonatFromBZMock: vi.fn(),
  getMonatFromBEMock: vi.fn(),
  getMonatFromEWTMock: vi.fn(),
  getMonatFromNMock: vi.fn(),
}));

vi.mock('../../../src/ts/infrastructure/date/getMonatFromItem', () => ({
  getMonatFromBZ: getMonatFromBZMock,
  getMonatFromBE: getMonatFromBEMock,
  getMonatFromEWT: getMonatFromEWTMock,
  getMonatFromN: getMonatFromNMock,
}));

vi.mock('../../../src/ts/infrastructure/data/normalizeResourceRows', () => ({
  default: (rows: unknown) => (Array.isArray(rows) ? rows : []),
}));

import { rowMatchesMonth } from '../../../src/ts/core/orchestration/auth/utils/loadUserDaten.helpers';

const ROW = { _id: 'x' };

describe('rowMatchesMonth', () => {
  describe('dataBZ', () => {
    it('gibt true zurück wenn Monat übereinstimmt', () => {
      getMonatFromBZMock.mockReturnValue(4);
      expect(rowMatchesMonth('dataBZ', ROW, 4)).toBe(true);
    });

    it('gibt false zurück wenn Monat nicht übereinstimmt', () => {
      getMonatFromBZMock.mockReturnValue(3);
      expect(rowMatchesMonth('dataBZ', ROW, 4)).toBe(false);
    });

    it('gibt true für Monat 0 wenn m <= 0', () => {
      getMonatFromBZMock.mockReturnValue(0);
      expect(rowMatchesMonth('dataBZ', ROW, 0)).toBe(true);
    });

    it('gibt false für Monat 0 wenn m > 0', () => {
      getMonatFromBZMock.mockReturnValue(4);
      expect(rowMatchesMonth('dataBZ', ROW, 0)).toBe(false);
    });
  });

  describe('dataBE', () => {
    it('gibt true zurück wenn Monat übereinstimmt', () => {
      getMonatFromBEMock.mockReturnValue(5);
      expect(rowMatchesMonth('dataBE', ROW, 5)).toBe(true);
    });

    it('gibt false zurück wenn Monat nicht übereinstimmt', () => {
      getMonatFromBEMock.mockReturnValue(3);
      expect(rowMatchesMonth('dataBE', ROW, 5)).toBe(false);
    });

    it('gibt true für Monat 0 wenn m <= 0', () => {
      getMonatFromBEMock.mockReturnValue(-1);
      expect(rowMatchesMonth('dataBE', ROW, 0)).toBe(true);
    });
  });

  describe('dataE', () => {
    it('gibt true zurück wenn Monat übereinstimmt', () => {
      getMonatFromEWTMock.mockReturnValue(7);
      expect(rowMatchesMonth('dataE', ROW, 7)).toBe(true);
    });

    it('gibt false zurück wenn Monat nicht übereinstimmt', () => {
      getMonatFromEWTMock.mockReturnValue(2);
      expect(rowMatchesMonth('dataE', ROW, 7)).toBe(false);
    });

    it('gibt true für Monat 0 wenn m <= 0', () => {
      getMonatFromEWTMock.mockReturnValue(0);
      expect(rowMatchesMonth('dataE', ROW, 0)).toBe(true);
    });
  });

  describe('dataN', () => {
    it('gibt true zurück wenn Monat übereinstimmt', () => {
      getMonatFromNMock.mockReturnValue(12);
      expect(rowMatchesMonth('dataN', ROW, 12)).toBe(true);
    });

    it('gibt false zurück wenn Monat nicht übereinstimmt', () => {
      getMonatFromNMock.mockReturnValue(11);
      expect(rowMatchesMonth('dataN', ROW, 12)).toBe(false);
    });
  });

  it('gibt false zurück für unbekannten Storage-Namen', () => {
    expect(rowMatchesMonth('VorgabenU' as never, ROW, 4)).toBe(false);
  });

  it('gibt false zurück wenn row null ist (dataBZ)', () => {
    expect(rowMatchesMonth('dataBZ', null, 4)).toBe(false);
  });
});
