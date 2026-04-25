import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT } from '../src/ts/core/types';

const {
  calculateEwtEintraegeMock,
  getEwtDatenMock,
  persistEwtTableDataMock,
  aktualisiereBerechnungMock,
  createSnackBarMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  calculateEwtEintraegeMock: vi.fn(),
  getEwtDatenMock: vi.fn(),
  persistEwtTableDataMock: vi.fn(),
  aktualisiereBerechnungMock: vi.fn(),
  createSnackBarMock: vi.fn(),
}));

vi.mock('../src/ts/features/EWT/utils', () => ({
  calculateEwtEintraege: calculateEwtEintraegeMock,
  getEwtDaten: getEwtDatenMock,
  persistEwtTableData: persistEwtTableDataMock,
}));

vi.mock('../src/ts/features/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

import recalculateEwtMonat from '../src/ts/features/EWT/utils/recalculateEwtMonat';

function createData(tagE: string, overrides: Partial<IDatenEWT> = {}): IDatenEWT {
  return {
    tagE,
    buchungstagE: tagE,
    eOrtE: 'Fulda',
    schichtE: 'T',
    abWE: '',
    ab1E: '',
    anEE: '',
    beginE: '',
    endeE: '',
    abEE: '',
    an1E: '',
    anWE: '',
    berechnen: true,
    ...overrides,
  };
}

describe('recalculateEwtMonat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('behält beim Berechnen die restlichen Jahresdaten im Table-State', () => {
    const marchEntry = createData('2026-03-10');
    const aprilEntry = createData('2026-04-10');
    const recalculatedAprilEntry = createData('2026-04-10', { beginE: '07:00', endeE: '15:00' });

    getEwtDatenMock.mockImplementation((data?: IDatenEWT[], monat?: number, options?: { scope?: string }) => {
      if (options?.scope === 'all') return [marchEntry, aprilEntry];
      return Array.isArray(data)
        ? data.filter(item => item.tagE.startsWith(`2026-${String(monat).padStart(2, '0')}`))
        : [];
    });
    calculateEwtEintraegeMock.mockReturnValue([recalculatedAprilEntry]);

    const tableE = { rows: { load: vi.fn() } };

    recalculateEwtMonat({
      monat: 4,
      daten: [aprilEntry],
      vorgabenU: { aZ: {}, fZ: [], pers: {} } as never,
      tableE: tableE as never,
    });

    expect(tableE.rows.load).toHaveBeenCalledWith([marchEntry, recalculatedAprilEntry]);
    expect(persistEwtTableDataMock).toHaveBeenCalledTimes(1);
  });
});
