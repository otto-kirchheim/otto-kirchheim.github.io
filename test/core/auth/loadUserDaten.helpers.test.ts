import { describe, expect, it, vi } from 'bun:test';

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

import { rowMatchesMonth, countByMonth } from '@/core/orchestration/auth/utils/loadUserDaten.helpers';

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

describe('countByMonth', () => {
  it('zählt normale Rows pro Monat', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [
      { _id: 'a', beginB: '...' },
      { _id: 'b', beginB: '...' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(2);
  });

  it('exkludiert Rows mit __localState === deleted', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [
      { _id: 'a', beginB: '...' },
      { _id: 'b', beginB: '...', __localState: 'deleted' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('zählt Rows mit anderem __localState-Wert normal', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', beginB: '...', __localState: 'other' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('exkludiert Pending-New-Rows ohne _id (werden nach dem Load automatisch nachgespeichert)', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', beginB: '...' }, { beginB: '...' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('exkludiert Rows mit explizitem __localState === new', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [
      { _id: 'a', beginB: '...', __localState: 'unchanged' },
      { beginB: '...', __localState: 'new' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('zählt Rows mit __localState === modified normal (existieren auf dem Server)', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', beginB: '...', __localState: 'modified' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('gibt leere Map für leeres Array zurück', () => {
    const result = countByMonth([], 'dataBZ');
    expect(result.size).toBe(0);
  });
});
