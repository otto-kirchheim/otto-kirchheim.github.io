import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { tableToArrayMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  tableToArrayMock: vi.fn(),
}));

vi.mock('../../src/ts/infrastructure/data/tableToArray', () => ({
  default: tableToArrayMock,
}));

import Storage from '../../src/ts/infrastructure/storage/Storage';
import saveTableDataVorgabenU from '../../src/ts/features/Einstellungen/utils/saveTableDataVorgabenU';
import type { CustomTable } from '../../src/ts/class/CustomTable';
import type { IVorgabenUvorgabenB } from '../../src/ts/interfaces';
import { VorgabenUMock } from '../mockData';

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: vi.fn(),
}));

describe('saveTableDataVorgabenU', () => {
  const fakeTable = {} as CustomTable<IVorgabenUvorgabenB>;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('speichert vorgabenB aus Tabelle in VorgabenU', () => {
    Storage.set('VorgabenU', VorgabenUMock);

    const tableData = new Map<number, IVorgabenUvorgabenB>([
      [0, { wpiB: 'Mo', anpiB: '07:00', aepiB: '15:00', pipiB: 'Ja' } as unknown as IVorgabenUvorgabenB],
    ]);
    tableToArrayMock.mockReturnValue(tableData);

    const result = saveTableDataVorgabenU(fakeTable);

    expect(tableToArrayMock).toHaveBeenCalledWith(fakeTable);
    expect(result.vorgabenB).toEqual({ 0: tableData.get(0)! });
    expect(result.pers.Vorname).toBe(VorgabenUMock.pers.Vorname);

    // Prüfe, dass der Wert in Storage geschrieben wurde
    const stored = Storage.get('VorgabenU');
    expect(stored).toEqual(result);
  });

  it('überschreibt bestehende vorgabenB', () => {
    Storage.set('VorgabenU', VorgabenUMock);

    const newData = new Map<number, IVorgabenUvorgabenB>([
      [0, { wpiB: 'Mi', anpiB: '08:00', aepiB: '16:00', pipiB: 'Nein' } as unknown as IVorgabenUvorgabenB],
      [1, { wpiB: 'Do', anpiB: '09:00', aepiB: '17:00', pipiB: 'Ja' } as unknown as IVorgabenUvorgabenB],
    ]);
    tableToArrayMock.mockReturnValue(newData);

    const result = saveTableDataVorgabenU(fakeTable);

    expect(Object.keys(result.vorgabenB)).toHaveLength(2);
  });
});
