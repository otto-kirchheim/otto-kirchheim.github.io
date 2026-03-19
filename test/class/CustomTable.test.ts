import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCustomTable, type CustomTableTypes } from '../../src/ts/class/CustomTable';

interface TableRow extends CustomTableTypes {
  _id?: string;
  label: string;
  value: string | number | boolean | null | undefined;
}

function createTableElement(id: string): HTMLTableElement {
  const table = document.createElement('table');
  table.id = id;
  document.body.appendChild(table);
  return table;
}

describe('CustomTable', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sortiert ohne Fehler bei leeren und falsy Werten', () => {
    createTableElement('sort-table');

    const table = createCustomTable<TableRow>('sort-table', {
      sorting: { enabled: true },
      columns: [
        {
          name: 'label',
          title: 'Label',
          sortable: false,
        },
        {
          name: 'value',
          title: 'Wert',
          sortable: true,
          sorted: true,
          direction: 'ASC',
        },
      ],
      rows: [
        { _id: 'a', label: 'leer', value: '' },
        { _id: 'b', label: 'zero', value: 0 },
        { _id: 'c', label: 'false', value: false },
        { _id: 'd', label: 'text', value: '9' },
      ],
    });

    expect(table.getRows()).toHaveLength(4);
    expect(table.getRows()[3].cells.label).toBe('leer');
  });

  it('sortiert dayjs-Werte ohne Fehler und behandelt gleiche Werte stabil', () => {
    createTableElement('dayjs-table');

    const table = createCustomTable('dayjs-table', {
      sorting: { enabled: true },
      columns: [
        {
          name: 'date',
          title: 'Datum',
          sortable: true,
          sorted: true,
          direction: 'DESC',
        },
      ],
      rows: [{ date: dayjs('2026-01-02') }, { date: dayjs('2026-01-02') }, { date: dayjs('2026-01-01') }],
    });

    expect(table.getRows()).toHaveLength(3);
    expect(dayjs.isDayjs(table.getRows()[0].cells.date)).toBe(true);
  });

  it('zeigt bei gelöschten Zeilen nur Undo-Button', () => {
    createTableElement('editing-table');

    const table = createCustomTable<TableRow>('editing-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow: vi.fn(),
        deleteRow: row => row.deleteRow(),
      },
      columns: [
        {
          name: 'label',
          title: 'Label',
        },
      ],
      rows: [{ _id: '1', label: 'Eintrag', value: 1 }],
    });

    const row = table.getRows()[0];
    row.deleteRow();

    const tbody = document.querySelector('tbody');
    expect(tbody).not.toBeNull();

    const undoButton = tbody?.querySelector('.btn-outline-warning');
    const editButton = tbody?.querySelector('.btn-outline-primary');
    const deleteButton = tbody?.querySelector('.btn-outline-danger');

    expect(undoButton).not.toBeNull();
    expect(editButton).toBeNull();
    expect(deleteButton).toBeNull();
  });

  it('rows.deleteAll benachrichtigt nur bei echten Änderungen', () => {
    createTableElement('delete-all-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('delete-all-table', {
      columns: [
        {
          name: 'label',
          title: 'Label',
        },
      ],
      rows: [
        { _id: '1', label: 'A', value: 1 },
        { _id: '2', label: 'B', value: 2 },
      ],
      onChange,
    });

    table.rows.deleteAll();
    table.rows.deleteAll();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(table.rows.hasPendingDeletes).toBe(true);
  });
});
