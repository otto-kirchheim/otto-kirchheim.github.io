import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  storageGetMock,
  getStoredMonatJahrMock,
  getMonatFromBZMock,
  getMonatFromBEMock,
  isEwtInMonatMock,
  getMonatFromNMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  storageGetMock: vi.fn(),
  getStoredMonatJahrMock: vi.fn(),
  getMonatFromBZMock: vi.fn(),
  getMonatFromBEMock: vi.fn(),
  isEwtInMonatMock: vi.fn(),
  getMonatFromNMock: vi.fn(),
}));

vi.mock('@/shared/lib/storage/Storage', () => ({ default: { get: storageGetMock } }));
vi.mock('@/shared/lib/date/dateStorage', () => ({ getStoredMonatJahr: getStoredMonatJahrMock }));
vi.mock('@/shared/lib/date/getMonatFromItem', () => ({
  getMonatFromBZ: getMonatFromBZMock,
  getMonatFromBE: getMonatFromBEMock,
  isEwtInMonat: isEwtInMonatMock,
  getMonatFromN: getMonatFromNMock,
}));

import '@/app/features';
import { createCustomTable, type CustomTableTypes } from '@/infrastructure/table/CustomTable';
import mergeVisibleResourceRows from '@/infrastructure/data/mergeVisibleResourceRows';

interface TableRow extends CustomTableTypes {
  _id?: string;
  label: string;
}

function createTableElement(id: string): HTMLTableElement {
  const el = document.createElement('table');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

describe('mergeVisibleResourceRows – toStorage Marker-Persistierung', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    storageGetMock.mockReturnValue([]);
    getStoredMonatJahrMock.mockReturnValue({ monat: 3, jahr: 2026 });
    getMonatFromBZMock.mockReturnValue(3);
    getMonatFromBEMock.mockReturnValue(3);
    isEwtInMonatMock.mockReturnValue(true);
    getMonatFromNMock.mockReturnValue(3);
  });

  it('persistiert für jeden _state den passenden expliziten __localState-Wert', () => {
    createTableElement('merge-table');
    const table = createCustomTable<TableRow>('merge-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
    });

    table.rows.add({ _id: 'u1', label: 'unchanged' }, 'unchanged');
    table.rows.add({ label: 'new' }, 'new');
    table.rows.add({ _id: 'm1', label: 'modified' }, 'modified');
    table.rows.add({ _id: 'd1', label: 'deleted' }, 'deleted');

    const result = mergeVisibleResourceRows('BZ', table) as Array<Record<string, unknown>>;

    expect(result.find(r => r.label === 'unchanged')?.__localState).toBe('unchanged');
    expect(result.find(r => r.label === 'new')?.__localState).toBe('new');
    expect(result.find(r => r.label === 'modified')?.__localState).toBe('modified');
    expect(result.find(r => r.label === 'deleted')?.__localState).toBe('deleted');
  });

  it('persistiert für error-Zeilen __errorMessage/__errorState statt __localState', () => {
    createTableElement('merge-error-table');
    const table = createCustomTable<TableRow>('merge-error-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
    });

    table.rows.add({ _id: 'e1', label: 'error' }, 'unchanged');
    const errorRow = table.rows.array[0];
    errorRow._state = 'error';
    errorRow._errorMessage = 'Speichern fehlgeschlagen';
    errorRow._errorState = 'modified';

    const result = mergeVisibleResourceRows('BZ', table) as Array<Record<string, unknown>>;

    expect(result[0].__errorMessage).toBe('Speichern fehlgeschlagen');
    expect(result[0].__errorState).toBe('modified');
    expect(result[0].__localState).toBeUndefined();
  });
});
