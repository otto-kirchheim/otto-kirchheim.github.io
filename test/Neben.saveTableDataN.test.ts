import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenN } from '../src/ts/interfaces';
import Storage from '../src/ts/infrastructure/storage/Storage';

const { tableToArrayMock, publishDataChangedMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  tableToArrayMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
}));

vi.mock('../src/ts/infrastructure/data/tableToArray', () => ({
  default: tableToArrayMock,
}));

vi.mock('../src/ts/core', () => ({
  publishDataChanged: publishDataChangedMock,
}));

import persistNebengeldTableData from '../src/ts/features/Neben/utils/persistNebengeldTableData';

function createData(tagN: string): IDatenN {
  return {
    tagN,
    beginN: '08:00',
    endeN: '10:00',
    anzahl040N: 0,
    auftragN: '',
  };
}

function createTableMock(rows: IDatenN[]) {
  const tableRows = rows.map(row => ({ cells: row, _state: 'unchanged' as const }));

  return {
    getRows: vi.fn(() => tableRows),
    drawRows: vi.fn(),
    rows: {
      array: tableRows,
      getFilteredRows: vi.fn(() => tableRows),
    },
  } as unknown as Parameters<typeof persistNebengeldTableData>[0];
}

describe('persistNebengeldTableData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('gibt fuer Jahre < 2024 bestehende FlatArray-Daten unveraendert zurueck', () => {
    const dataN: IDatenN[] = [createData('2023-03-10')];

    Storage.set('Jahr', 2023);
    Storage.set('dataN', dataN);

    const result = persistNebengeldTableData({} as never);

    expect(result).toEqual(dataN);
    expect(tableToArrayMock).not.toHaveBeenCalled();
    expect(publishDataChangedMock).not.toHaveBeenCalled();
  });

  it('aktualisiert dataN aus den sichtbaren Tabellenzeilen und triggert Berechnung', () => {
    const dataN: IDatenN[] = [createData('2026-03-10')];
    const newRows = [createData('2026-03-11')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 3);
    Storage.set('dataN', dataN);

    const ftMock = createTableMock(newRows);
    const result = persistNebengeldTableData(ftMock);

    expect(result).toEqual(newRows);
    expect(Storage.get<IDatenN[]>('dataN', { check: true })).toEqual(newRows);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
  });

  it('behält andere Monate, wenn nur der ausgewählte Monat neu persistiert wird', () => {
    const marchEntry = createData('2026-03-10');
    const aprilEntry = createData('2026-04-10');
    const updatedAprilRows = [createData('2026-04-20')];

    Storage.set('Jahr', 2026);
    Storage.set('Monat', 4);
    Storage.set('dataN', [marchEntry, aprilEntry]);

    const ftMock = createTableMock(updatedAprilRows);
    const result = persistNebengeldTableData(ftMock);

    expect(result).toEqual([marchEntry, updatedAprilRows[0]]);
    expect(Storage.get<IDatenN[]>('dataN', { check: true })).toEqual([marchEntry, updatedAprilRows[0]]);
  });
});
