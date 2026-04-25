import { beforeEach, describe, expect, it } from 'bun:test';
import tableToArray from '../../src/ts/infrastructure/data/tableToArray';
import type { CustomTable, Row } from '../../src/ts/infrastructure/table/CustomTable';
import type { CustomHTMLTableElement } from '../../src/ts/core/types';

interface MockData {
  [key: string]: string | number | undefined;
  name: string;
  value: number;
}

/** Erstellt ein DOM-Table-Element mit einer gemockten CustomTable-Instanz */
function createMockTableElement(id: string, rows: Row<MockData>[]): void {
  const tableEl = document.createElement('table');
  tableEl.id = id;
  (tableEl as unknown as CustomHTMLTableElement<MockData>).instance = {
    getRows: () => rows,
  } as unknown as CustomTable<MockData>;
  document.body.appendChild(tableEl);
}

describe('tableToArray', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('gibt alle nicht-gelöschten Zeilen zurück', () => {
    createMockTableElement('t1', [
      { cells: { name: 'A', value: 1 }, _state: 'unchanged' } as unknown as Row<MockData>,
      { cells: { name: 'B', value: 2 }, _state: 'new' } as unknown as Row<MockData>,
    ]);

    const result = tableToArray<MockData>('t1');
    expect(result).toEqual([
      { name: 'A', value: 1 },
      { name: 'B', value: 2 },
    ]);
  });

  it('filtert gelöschte Zeilen heraus', () => {
    createMockTableElement('t2', [
      { cells: { name: 'A', value: 1 }, _state: 'unchanged' } as unknown as Row<MockData>,
      { cells: { name: 'Deleted', value: 99 }, _state: 'deleted' } as unknown as Row<MockData>,
      { cells: { name: 'B', value: 2 }, _state: 'modified' } as unknown as Row<MockData>,
    ]);

    const result = tableToArray<MockData>('t2');
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toEqual(['A', 'B']);
  });

  it('wirft Error wenn Tabelle per String nicht gefunden wird', () => {
    expect(() => tableToArray<MockData>('nonExistentTable')).toThrow('Tabelle nicht gefunden');
  });

  it('findet Tabelle per String-ID im DOM', () => {
    createMockTableElement('myTable', [
      { cells: { name: 'X', value: 42 }, _state: 'unchanged' } as unknown as Row<MockData>,
    ]);

    const result = tableToArray<MockData>('myTable');
    expect(result).toEqual([{ name: 'X', value: 42 }]);
  });

  it('gibt leeres Array wenn keine Zeilen vorhanden', () => {
    createMockTableElement('empty', []);
    expect(tableToArray<MockData>('empty')).toEqual([]);
  });

  it('gibt leeres Array wenn alle Zeilen gelöscht', () => {
    createMockTableElement('allDeleted', [
      { cells: { name: 'Del1', value: 1 }, _state: 'deleted' } as unknown as Row<MockData>,
      { cells: { name: 'Del2', value: 2 }, _state: 'deleted' } as unknown as Row<MockData>,
    ]);

    expect(tableToArray<MockData>('allDeleted')).toEqual([]);
  });
});
