import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createCustomTable, type CustomTableTypes } from '@/infrastructure/table/CustomTable';

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
    expect(tr?.querySelector('.customtable-error-icon')?.getAttribute('data-icon')).toBe('exclamation_mark_circle');
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

  it('rows.load setzt _state new für Rows ohne _id und löst onChange aus', () => {
    createTableElement('load-new-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-new-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([{ label: 'Neue Zeile', value: 1 }] as unknown as TableRow[]);

    const rows = table.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]._state).toBe('new');
    expect(rows[0]._clientRequestId).toBeDefined();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rows.load restauriert _state error aus __errorMessage (Regression)', () => {
    createTableElement('load-error-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-error-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([
      { _id: '1', label: 'Fehlerzeile', value: 1, __errorMessage: 'Verbindungsfehler', __errorState: 'modified' },
    ] as unknown as TableRow[]);

    const rows = table.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]._state).toBe('error');
    expect(rows[0]._errorMessage).toBe('Verbindungsfehler');
    expect(rows[0]._errorState).toBe('modified');
    expect(rows[0].cells._id).toBe('1');
    expect((rows[0].cells as Record<string, unknown>).__errorMessage).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rows.load restauriert _state deleted aus __localState (Regression)', () => {
    createTableElement('load-deleted-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-deleted-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([
      { _id: '2', label: 'Gelöschte Zeile', value: 2, __localState: 'deleted' },
    ] as unknown as TableRow[]);

    const rows = table.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]._state).toBe('deleted');
    expect((rows[0].cells as Record<string, unknown>).__localState).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rows.load restauriert _state modified aus __localState und löst onChange aus', () => {
    createTableElement('load-modified-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-modified-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([
      { _id: '3', label: 'Geänderte Zeile', value: 3, __localState: 'modified' },
    ] as unknown as TableRow[]);

    const rows = table.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]._state).toBe('modified');
    expect((rows[0].cells as Record<string, unknown>).__localState).toBeUndefined();
    expect(table.rows.getChanges(false).update).toHaveLength(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rows.load restauriert _state new aus explizitem __localState und löst onChange aus', () => {
    createTableElement('load-new-marker-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-new-marker-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([{ label: 'Neue Zeile (Marker)', value: 4, __localState: 'new' }] as unknown as TableRow[]);

    const rows = table.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]._state).toBe('new');
    expect(rows[0]._clientRequestId).toBeDefined();
    expect((rows[0].cells as Record<string, unknown>).__localState).toBeUndefined();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rows.load restauriert _state unchanged aus explizitem __localState ohne onChange', () => {
    createTableElement('load-unchanged-marker-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-unchanged-marker-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([
      { _id: 'xyz', label: 'Unveränderte Zeile', value: 5, __localState: 'unchanged' },
    ] as unknown as TableRow[]);

    expect(table.getRows()[0]._state).toBe('unchanged');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rows.load löst kein onChange aus wenn alle Rows _id haben', () => {
    createTableElement('load-unchanged-table');
    const onChange = vi.fn();

    const table = createCustomTable<TableRow>('load-unchanged-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.load([{ _id: 'abc', label: 'Bekannte Zeile', value: 99 }]);

    expect(table.getRows()[0]._state).toBe('unchanged');
    expect(onChange).not.toHaveBeenCalled();
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

  // ─── Row: isError / isDirty / undoDelete ───────────────────

  it('row.isError und row.isDirty spiegeln den State korrekt wider', () => {
    createTableElement('row-state-table');
    const table = createCustomTable<TableRow>('row-state-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const row = table.getRows()[0];
    expect(row.isError).toBe(false);
    expect(row.isDirty).toBe(false);

    row._state = 'error';
    expect(row.isError).toBe(true);

    row._state = 'modified';
    expect(row.isDirty).toBe(true);
  });

  it('row.undoDelete macht das Soft-Delete rückgängig', () => {
    createTableElement('undo-delete-table');
    const table = createCustomTable<TableRow>('undo-delete-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const row = table.getRows()[0];
    row.deleteRow();
    expect(row.isDeleted).toBe(true);

    row.undoDelete();
    expect(row.isDeleted).toBe(false);
    expect(row._state).toBe('unchanged');
  });

  it('row.undoDelete ist ein No-Op wenn die Zeile nicht gelöscht ist', () => {
    createTableElement('undo-delete-noop-table');
    const table = createCustomTable<TableRow>('undo-delete-noop-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const row = table.getRows()[0];
    row.undoDelete();
    expect(row._state).toBe('unchanged');
  });

  // ─── Rows: add / loadSmart / setFilter / hasChanges ────────

  it('rows.add fügt eine neue Zeile hinzu und benachrichtigt onChange', () => {
    createTableElement('rows-add-table');
    const onChange = vi.fn();
    const table = createCustomTable<TableRow>('rows-add-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
      onChange,
    });

    table.rows.add({ label: 'Neu', value: 1 });

    expect(table.getRows()).toHaveLength(1);
    expect(table.getRows()[0]._state).toBe('new');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rows.loadSmart verhält sich identisch zu rows.load', () => {
    createTableElement('rows-loadsmart-table');
    const table = createCustomTable<TableRow>('rows-loadsmart-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- testet bewusst die deprecated API für Regressionsschutz
    table.rows.loadSmart([{ _id: 'x1', label: 'Smart', value: 1 }]);

    expect(table.getRows()).toHaveLength(1);
    expect(table.getRows()[0]._state).toBe('unchanged');
    expect(table.getRows()[0]._id).toBe('x1');
  });

  it('rows.setFilter blendet Zeilen aus ohne sie aus dem State zu entfernen', () => {
    createTableElement('rows-filter-table');
    const table = createCustomTable<TableRow>('rows-filter-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [
        { _id: '1', label: 'Sichtbar', value: 1 },
        { _id: '2', label: 'Versteckt', value: 2 },
      ],
    });

    table.rows.setFilter(cells => cells.label === 'Sichtbar');

    expect(table.rows.getFilteredRows()).toHaveLength(1);
    expect(table.getRows()).toHaveLength(2);
    expect(document.querySelectorAll('tbody tr').length).toBe(1);

    table.rows.setFilter(null);
    expect(table.rows.getFilteredRows()).toHaveLength(2);
  });

  it('hasAutoSaveChanges und hasChanges spiegeln den Zeilenstatus wider', () => {
    createTableElement('rows-changes-table');
    const table = createCustomTable<TableRow>('rows-changes-table', {
      columns: [{ name: 'label', title: 'Label' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    expect(table.rows.hasAutoSaveChanges).toBe(false);
    expect(table.rows.hasChanges).toBe(false);

    table.rows.add({ label: 'Neu', value: 2 });

    expect(table.rows.hasAutoSaveChanges).toBe(true);
    expect(table.rows.hasChanges).toBe(true);
  });

  // ─── CustomTable: getArray ──────────────────────────────────

  it('getArray liefert die Zellwerte aller Zeilen als Array', () => {
    createTableElement('get-array-table');
    const table = createCustomTable<TableRow>('get-array-table', {
      columns: [
        { name: 'label', title: 'Label' },
        { name: 'value', title: 'Wert' },
      ],
      rows: [
        { _id: '1', label: 'A', value: 1 },
        { _id: '2', label: 'B', value: 2 },
      ],
    });

    const array = table.getArray();
    expect(array).toHaveLength(2);
    expect(array[0]).toEqual(Object.values(table.getRows()[0].cells));
  });

  // ─── Footer-Buttons: Add / Custom-Button ────────────────────

  it('löst addRow- und Custom-Button-Handler beim Klick im Footer aus', () => {
    createTableElement('footer-click-table');
    const addRow = vi.fn();
    const customFn = vi.fn();

    createCustomTable<TableRow>('footer-click-table', {
      editing: {
        enabled: true,
        addRow,
        editRow: vi.fn(),
        showRow: vi.fn(),
        deleteRow: vi.fn(),
        deleteAllRows: vi.fn(),
        customButton: [{ text: 'Extra', classes: ['btn', 'btn-secondary'], function: customFn }],
      },
      columns: [{ name: 'label', title: 'Label' }],
      rows: [],
    });

    // Seit Phase F sind es DB-Buttons: die Bootstrap-Variante steckt in `data-variant`/`data-color`.
    const addButton = document.querySelector<HTMLButtonElement>('tfoot .db-button[data-variant="brand"]');
    const customButton = document.querySelector<HTMLButtonElement>(
      'tfoot .db-button[data-variant="filled"]:not([data-color])',
    );
    expect(addButton).not.toBeNull();
    expect(customButton).not.toBeNull();

    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    customButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(addRow).toHaveBeenCalledTimes(1);
    expect(customFn).toHaveBeenCalledTimes(1);
  });

  // ─── Zeilen-Buttons: editRow / deleteRow ─────────────────────

  it('löst editRow und deleteRow beim Klick auf die Zeilen-Buttons aus', () => {
    createTableElement('row-actions-table');
    const editRow = vi.fn();
    const deleteRow = vi.fn();

    const table = createCustomTable<TableRow>('row-actions-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow,
        showRow: vi.fn(),
        deleteRow,
      },
      columns: [{ name: 'label', title: 'Label' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const editButton = document.querySelector<HTMLButtonElement>(
      'tbody .db-button[data-variant="outlined"]:not([data-color])',
    );
    const deleteButton = document.querySelector<HTMLButtonElement>(
      'tbody .db-button[data-variant="outlined"][data-color="critical"]',
    );
    expect(editButton).not.toBeNull();
    expect(deleteButton).not.toBeNull();

    editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editRow).toHaveBeenCalledWith(table.getRows()[0]);
    expect(deleteRow).toHaveBeenCalledWith(table.getRows()[0]);
  });

  // ─── Zeilen-Klick (mobiler Breakpoint) → showRow ─────────────

  it('ruft showRow beim Klick auf eine Zeile im mobilen Breakpoint-Bereich auf', () => {
    createTableElement('row-click-table');
    const showRow = vi.fn();

    const table = createCustomTable<TableRow>('row-click-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow,
        deleteRow: vi.fn(),
      },
      columns: [{ name: 'label', title: 'Label', breakpoints: 'xs' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const tr = document.querySelector<HTMLTableRowElement>('tbody tr');
    expect(tr).not.toBeNull();
    tr?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(showRow).toHaveBeenCalledWith(table.getRows()[0]);
  });

  it('ignoriert Klicks auf bereits gelöschte Zeilen', () => {
    createTableElement('row-click-deleted-table');
    const showRow = vi.fn();

    const table = createCustomTable<TableRow>('row-click-deleted-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow,
        deleteRow: row => row.deleteRow(),
      },
      columns: [{ name: 'label', title: 'Label', breakpoints: 'xs' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    table.getRows()[0].deleteRow();
    const tr = document.querySelector<HTMLTableRowElement>('tbody tr');
    tr?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(showRow).not.toHaveBeenCalled();
  });

  // ─── Standard-No-Op-Handler wenn keine Callbacks übergeben werden ──

  it('nutzt Standard-No-Op-Handler für addRow/editRow/showRow/deleteRow wenn keine Callbacks übergeben werden', () => {
    createTableElement('default-noop-table');

    const table = createCustomTable<TableRow>('default-noop-table', {
      // Absichtlich ohne addRow/editRow/showRow/deleteRow, um Default-No-Ops zu testen
      editing: { enabled: true, deleteAllRows: vi.fn() } as any,
      columns: [{ name: 'label', title: 'Label', breakpoints: 'xs' }],
      rows: [{ _id: '1', label: 'A', value: 1 }],
    });

    const addButton = document.querySelector<HTMLButtonElement>('tfoot .btn-primary');
    const editButton = document.querySelector<HTMLButtonElement>(
      'tbody .db-button[data-variant="outlined"]:not([data-color])',
    );
    const deleteButton = document.querySelector<HTMLButtonElement>(
      'tbody .db-button[data-variant="outlined"][data-color="critical"]',
    );
    const tr = document.querySelector<HTMLTableRowElement>('tbody tr');

    expect(() => addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(() => editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(() => deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(() => tr?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();

    // Standard-Handler sind No-Ops: Zeilenstatus bleibt unverändert
    expect(table.getRows()).toHaveLength(1);
    expect(table.getRows()[0]._state).toBe('unchanged');
  });

  // ─── Standard-deleteAllRows (private Methode) ────────────────

  it('deleteAllRows (private Methode) leert alle Zeilen und rendert neu', () => {
    createTableElement('default-delete-all-table');

    const table = createCustomTable<TableRow>('default-delete-all-table', {
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow: vi.fn(),
        deleteRow: vi.fn(),
      },
      columns: [{ name: 'label', title: 'Label' }],
      rows: [
        { _id: '1', label: 'A', value: 1 },
        { _id: '2', label: 'B', value: 2 },
      ],
    });

    expect(table.getRows()).toHaveLength(2);

    // Private Methode direkt mit korrektem `this`-Kontext aufrufen
    // (der Options-Default `this.deleteAllRows` wird als unbound Referenz gespeichert
    // und ist daher nur über einen an die Instanz gebundenen Aufruf sicher testbar).
    (table as unknown as { deleteAllRows: () => void }).deleteAllRows();

    expect(table.getRows()).toHaveLength(0);
  });

  // ─── Sortierbarer Spaltenkopf: Klick → onSortClicked ─────────

  it('sortiert nach Klick auf den Spaltenkopf und wechselt die Richtung bei erneutem Klick', () => {
    createTableElement('header-sort-table');

    const table = createCustomTable<TableRow>('header-sort-table', {
      sorting: { enabled: true },
      editing: {
        enabled: true,
        addRow: vi.fn(),
        editRow: vi.fn(),
        showRow: vi.fn(),
        deleteRow: vi.fn(),
      },
      columns: [{ name: 'value', title: 'Wert', sortable: true }],
      rows: [
        { _id: 'a', label: 'A', value: 3 },
        { _id: 'b', label: 'B', value: 1 },
        { _id: 'c', label: 'C', value: 2 },
      ],
    });

    const th = document.querySelector<HTMLTableCellElement>('thead th.customtable-sortable');
    expect(th).not.toBeNull();
    th?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const column = table.columns.array.find(c => c.name === 'value');
    expect(column?.sorted).toBe(true);
    expect(column?.direction).toBe('ASC');

    const thAfterFirstSort = document.querySelector<HTMLTableCellElement>('thead th.customtable-sortable');
    thAfterFirstSort?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(column?.direction).toBe('DESC');
  });

  describe('AutoSave-Commit-Race (getChangeRows + includedRows)', () => {
    it('committet nur Zeilen aus dem Snapshot - waehrend des Requests neu angelegte Zeile bleibt "new" ohne _id', () => {
      createTableElement('race-create-table');

      const table = createCustomTable<TableRow>('race-create-table', {
        columns: [{ name: 'label', title: 'Label' }],
        rows: [],
      });

      table.rows.add({ label: 'zuerst' } as TableRow);

      // Snapshot wie im echten AutoSave-Flow: VOR dem Request genommen.
      const changeRows = table.rows.getChangeRows(false);
      expect(changeRows.create).toHaveLength(1);
      const includedRows = new Set(changeRows.create);

      // Waehrend der Request "in flight" ist, legt der Nutzer eine zweite Zeile an.
      table.rows.add({ label: 'waehrenddessen' } as TableRow);
      expect(table.rows.array).toHaveLength(2);

      const createdIds = new Map<number, string>([[0, 'server-id-1']]);
      table.rows.commitAutoSave(createdIds, new Set(), includedRows);

      const [first, second] = table.rows.array;
      expect(first._state).toBe('unchanged');
      expect(first._id).toBe('server-id-1');
      // Die nachtraeglich angelegte Zeile darf NICHT als committet gelten - sonst geht sie
      // verloren, weil sie nie eine _id bekommt und getChanges() sie danach nicht mehr findet.
      expect(second._state).toBe('new');
      expect(second._id).toBeUndefined();
      expect(table.rows.getChanges(false).create).toHaveLength(1);
    });

    it('entfernt beim manuellen Speichern nur Loeschungen aus dem Snapshot - waehrend des Requests geloeschte Zeile bleibt erhalten', () => {
      createTableElement('race-delete-table');

      const table = createCustomTable<TableRow>('race-delete-table', {
        columns: [{ name: 'label', title: 'Label' }],
        rows: [
          { _id: 'a', label: 'A', value: 1 },
          { _id: 'b', label: 'B', value: 2 },
        ],
      });

      table.getRows()[0].deleteRow();
      const changeRows = table.rows.getChangeRows(true);
      expect(changeRows.delete).toHaveLength(1);
      const includedRows = new Set(changeRows.delete);

      // Waehrend der Request laeuft, loescht der Nutzer eine zweite, noch nicht mitgesendete Zeile.
      table.getRows()[1].deleteRow();

      table.rows.commitChanges(new Map(), new Set(), includedRows);

      expect(table.rows.array).toHaveLength(1);
      expect(table.rows.array[0]._id).toBe('b');
      expect(table.rows.array[0]._state).toBe('deleted');
    });
  });
});
