import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createCustomTable, type CustomTableTypes } from '../../src/ts/infrastructure/table/CustomTable';

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

  it('hebt Fehlerzeilen sichtbar hervor und behaelt ihr Retry-Tracking', () => {
    createTableElement('error-table');

    const table = createCustomTable<TableRow>('error-table', {
      columns: [
        {
          name: 'label',
          title: 'Label',
        },
      ],
      rows: [{ _id: '1', label: 'Fehlerhaft', value: 1 }],
    });

    const row = table.getRows()[0];
    row._state = 'error';
    row._errorState = 'modified';
    row._errorMessage = 'Validierung fehlgeschlagen';
    table.drawRows();

    const tr = document.querySelector<HTMLTableRowElement>('tbody tr');
    expect(tr).not.toBeNull();
    expect(tr?.classList.contains('customtable-error')).toBe(true);
    expect(tr?.getAttribute('data-error-message')).toBe('Validierung fehlgeschlagen');
    expect(tr?.title).toBe('Validierung fehlgeschlagen');
    expect(tr?.querySelector('.customtable-error-icon')?.textContent).toBe('error');
    expect(table.rows.getChanges(false).update).toHaveLength(1);
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

  it('verwendet für Tabellenaktionen in Formularen keine impliziten Submit-Buttons', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);

    const tableElement = document.createElement('table');
    tableElement.id = 'form-table';
    form.appendChild(tableElement);

    createCustomTable<TableRow>('form-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow: vi.fn(),
        deleteRow: vi.fn(),
        customButton: [{ text: 'Extra', classes: ['btn', 'btn-secondary'], function: vi.fn() }],
      },
      columns: [
        {
          name: 'label',
          title: 'Label',
        },
      ],
      rows: [{ _id: '1', label: 'Eintrag', value: 1 }],
    });

    const actionButtons = Array.from(form.querySelectorAll<HTMLButtonElement>('button'));

    expect(actionButtons.length).toBeGreaterThan(0);
    actionButtons.forEach(button => {
      expect(button.type).toBe('button');
    });
  });
});
