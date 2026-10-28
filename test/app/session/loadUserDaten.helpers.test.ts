import { describe, expect, it, vi } from 'bun:test';

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
import { rowMatchesMonth, countByMonth, healUnchangedRowsAgainstServer } from '@/app/session/loadUserDaten.helpers';

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
      { _id: 'a', Beginn: '...' },
      { _id: 'b', Beginn: '...' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(2);
  });

  it('exkludiert Rows mit __localState === deleted', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [
      { _id: 'a', Beginn: '...' },
      { _id: 'b', Beginn: '...', __localState: 'deleted' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('zählt Rows mit anderem __localState-Wert normal', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', Beginn: '...', __localState: 'other' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('exkludiert Pending-New-Rows ohne _id (werden nach dem Load automatisch nachgespeichert)', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', Beginn: '...' }, { Beginn: '...' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('exkludiert Rows mit explizitem __localState === new', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [
      { _id: 'a', Beginn: '...', __localState: 'unchanged' },
      { Beginn: '...', __localState: 'new' },
    ];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('zählt Rows mit __localState === modified normal (existieren auf dem Server)', () => {
    getMonatFromBZMock.mockReturnValue(3);
    const rows = [{ _id: 'a', Beginn: '...', __localState: 'modified' }];
    const result = countByMonth(rows, 'dataBZ');
    expect(result.get(3)).toBe(1);
  });

  it('gibt leere Map für leeres Array zurück', () => {
    const result = countByMonth([], 'dataBZ');
    expect(result.size).toBe(0);
  });
});

describe('healUnchangedRowsAgainstServer', () => {
  it('übernimmt den Serverinhalt für eine unveränderte Zeile mit abweichendem Inhalt', () => {
    const local = [{ _id: 'a', wert: 'alt', __localState: 'unchanged' }];
    const server = [{ _id: 'a', wert: 'neu' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toMatchObject({ _id: 'a', wert: 'neu', __localState: 'unchanged' });
  });

  it('lässt eine Zeile mit eigener Änderung unberührt, auch bei abweichendem Serverinhalt', () => {
    const local = [{ _id: 'a', wert: 'lokal-geaendert', __localState: 'modified' }];
    const server = [{ _id: 'a', wert: 'server-stand' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toMatchObject({ _id: 'a', wert: 'lokal-geaendert', __localState: 'modified' });
  });

  it('lässt eine fehlerhafte Zeile (__errorMessage) unberührt, auch wenn __localState unchanged wäre', () => {
    const local = [{ _id: 'a', wert: 'alt', __localState: 'unchanged', __errorMessage: 'Server 500' }];
    const server = [{ _id: 'a', wert: 'neu' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toMatchObject({ wert: 'alt', __errorMessage: 'Server 500' });
  });

  it('lässt eine unveränderte Zeile unberührt, wenn der Inhalt mit dem Server übereinstimmt', () => {
    const local = [{ _id: 'a', wert: 'gleich', __localState: 'unchanged' }];
    const server = [{ _id: 'a', wert: 'gleich' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toBe(local[0]);
  });

  it('lässt eine Zeile ohne Server-Treffer (_id) unberührt', () => {
    const local = [{ _id: 'a', wert: 'alt', __localState: 'unchanged' }];
    const server = [{ _id: 'b', wert: 'neu' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toBe(local[0]);
  });

  it('lässt eine Pending-New-Zeile ohne _id unberührt', () => {
    const local = [{ wert: 'neu-lokal', __localState: 'new' }];
    const server = [{ _id: 'a', wert: 'server' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result[0]).toBe(local[0]);
  });

  it('gibt dasselbe Array zurück, wenn keine Serverzeile eine _id hat', () => {
    const local = [{ _id: 'a', wert: 'alt', __localState: 'unchanged' }];
    const server = [{ wert: 'ohne-id' }];

    const result = healUnchangedRowsAgainstServer(local, server);

    expect(result).toBe(local);
  });
});
