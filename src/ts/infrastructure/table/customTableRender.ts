import Tooltip from 'bootstrap/js/dist/tooltip';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Column } from './Column';
import type { CustomTable } from './CustomTable';
import type { CustomHTMLTableRowElement, CustomTableTypes, Directions } from './customTableTypes';
import type { Row } from './Row';

/**
 * It creates a footer for the table
 */
export function renderFooter<T extends CustomTableTypes>(self: CustomTable<T>): void {
  if (self.options.customFunction?.beforeDrawFooter) self.options.customFunction.beforeDrawFooter.call(self);

  const tfoot = <HTMLTableSectionElement>self.$el.tFoot;
  tfoot.innerHTML = '';
  if (self.state.editing) {
    const tr = document.createElement('tr');
    tr.classList.add('customtable-editing');

    const td = document.createElement('td');
    td.colSpan = self.columns.array.length + 1;

    const divFooter = document.createElement('div');
    divFooter.classList.add('justify-content-sm-evenly');

    const buttonAdd = createButton(['btn', 'btn-primary'], self.options.editing.addText, self.options.editing.addRow);
    const buttonDeleteAlle = createButton(
      ['btn', 'btn-danger'],
      self.options.editing.deleteAllText,
      self.options.editing.deleteAllRows,
    );
    divFooter.appendChild(buttonAdd);
    if (self.options.editing.customButton && self.options.editing.customButton.length > 0) {
      self.options.editing.customButton.forEach(button => {
        const customButton = createButton(button.classes, button.text, button.function);
        divFooter.appendChild(customButton);
      });
    }

    divFooter.appendChild(buttonDeleteAlle);

    td.appendChild(divFooter);
    tr.appendChild(td);
    tfoot.appendChild(tr);
  }
  if (self.options.customFunction?.afterDrawFooter) self.options.customFunction.afterDrawFooter.call(self);

  function createButton(classes = ['btn', 'btn-primary'], text = 'Button', eventlistener = () => {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add(...classes);
    button.innerText = text;
    button.title = text;
    button.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      eventlistener();
    });
    return button;
  }
}

/**
 * It draws the rows of the table
 */
export function renderRows<T extends CustomTableTypes>(self: CustomTable<T>): void {
  if (self.options.customFunction?.beforeDrawRows) self.options.customFunction.beforeDrawRows.call(self);

  const thead = self.$el.tHead as HTMLTableSectionElement;
  const tbody = self.$el.tBodies[0];
  const tfoot = self.$el.tFoot as HTMLTableSectionElement;
  tbody.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach(el => Tooltip.getInstance(el)?.dispose());
  tbody.innerHTML = '';
  const sortedColumn = self.columns.array.find(column => column.sorted);
  if (sortedColumn) sortRows(self, sortedColumn.index, sortedColumn.direction);

  // Alle Zeilen bleiben im State erhalten, angezeigt werden nur gefilterte Zeilen.
  const allVisibleRows = self.rows.getFilteredRows();

  if (allVisibleRows.length > 0) {
    const createActionButton = (
      classList: string[],
      text: string,
      eventListener: (row: Row<T>) => void,
      row: Row<T>,
      title = 'button',
    ): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add(...classList);
      button.innerHTML = text;
      button.title = title;
      button.addEventListener('click', event => {
        event.stopPropagation();
        event.preventDefault();
        eventListener(row);
      });
      return button;
    };

    for (const row of allVisibleRows) {
      const tr: CustomHTMLTableRowElement<T> = document.createElement('tr');
      let errorIconRendered = false;

      // Soft-Delete Styling: durchgestrichen + ausgegraut
      if (row.isDeleted) {
        tr.classList.add('customtable-deleted');
      }
      if (row.isError) {
        tr.classList.add('customtable-error');
        if (row._errorMessage) {
          tr.dataset.errorMessage = row._errorMessage;
          tr.title = row._errorMessage;
          tr.setAttribute('aria-label', `Fehler: ${row._errorMessage}`);
        }
      }

      row.columns.array.forEach(column => {
        if (!column.visible) {
          return;
        }
        const td = document.createElement('td');
        if (row.isError && row._errorMessage) {
          td.setAttribute('data-bs-toggle', 'tooltip');
          td.setAttribute('data-bs-title', row._errorMessage);
          new Tooltip(td, { placement: 'auto', trigger: 'hover focus' });
        }
        if (row.isError && !errorIconRendered) {
          const icon = document.createElement('span');
          icon.classList.add('material-icons-round', 'customtable-error-icon');
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = 'error';
          td.appendChild(icon);
          errorIconRendered = true;
        }
        if (column.editing) {
          const divBtnGroup = document.createElement('div');
          divBtnGroup.classList.add('btn-group', 'btn-group-sm');
          divBtnGroup.setAttribute('role', 'group');

          if (row.isDeleted) {
            // Gelöschte Zeile: nur Undo-Button anzeigen
            const buttonUndo = createActionButton(
              ['btn', 'btn-outline-warning'],
              column.editing.undoDeleteText,
              (r: Row<T>) => r.undoDelete(),
              row,
              'undo',
            );
            divBtnGroup.append(buttonUndo);
          } else {
            // Normale Zeile: Edit + Delete Buttons
            const buttonEdit = createActionButton(
              ['btn', 'btn-outline-primary'],
              column.editing.editText,
              self.options.editing.editRow,
              row,
              'edit',
            );
            const buttonDelete = createActionButton(
              ['btn', 'btn-outline-danger'],
              column.editing.deleteText,
              self.options.editing.deleteRow,
              row,
              'delete',
            );

            divBtnGroup.append(buttonEdit);
            divBtnGroup.append(buttonDelete);
          }
          td.appendChild(divBtnGroup);
        } else {
          const cellContent = column.parser(row.cells[column.name] as T[keyof T]).toString();
          const content = document.createElement('span');
          // Standardmäßig Text: Zellwerte enthalten Freitext aus Benutzereingaben
          // (z.B. Einsatzort, Auftragsnummer). Nur Spalten mit `html: true`, deren
          // Parser festes Markup aus dem eigenen Code erzeugt, werden als HTML gesetzt.
          if (column.html) content.innerHTML = cellContent;
          else content.textContent = cellContent;
          td.appendChild(content);
        }
        if (column.breakpoints) td.dataset.breakpoints = column.breakpoints;
        if (column.classes.length > 0) td.classList.add(...column.classes);
        tr.append(td);
      });
      tr.addEventListener('click', (event: MouseEvent): void => {
        if (row.isDeleted) return; // Gelöschte Zeilen nicht anklickbar
        if ((event.view?.innerWidth ?? 0) > self.maxBreakpoint()) return;
        event.stopPropagation();
        self.options.editing.showRow(row);
      });
      tr.data = row;
      row.$el = tr;
      tbody.appendChild(tr);
    }
    thead.style.display = '';
    const dangerBtn = tfoot?.querySelector<HTMLButtonElement>('.btn-danger');
    if (dangerBtn) dangerBtn.style.display = '';
  } else {
    const tr = document.createElement('tr');
    tr.classList.add('customtable-empty');
    const td = document.createElement('td');
    td.colSpan = self.columns.array.length + 1;
    td.innerText = typeof self.options.empty === 'function' ? self.options.empty() : self.options.empty;
    tr.appendChild(td);
    tbody.appendChild(tr);

    thead.style.display = 'none';
    const dangerBtn = tfoot?.querySelector<HTMLButtonElement>('.btn-danger');
    if (dangerBtn) dangerBtn.style.display = 'none';
  }
  if (self.options.customFunction?.afterDrawRows) self.options.customFunction.afterDrawRows.call(self);
}

/**
 * It draws the header of the table
 */
export function renderHeader<T extends CustomTableTypes>(self: CustomTable<T>): void {
  if (self.options.customFunction?.beforeDrawHeader) self.options.customFunction.beforeDrawHeader.call(self);
  const thead = self.$el.tHead as HTMLTableSectionElement;
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  tr.classList.add('customtable-header', 'table-primary');
  self.columns.array.forEach(column => {
    if (!column.visible) return;
    const th = document.createElement('th');
    if (column.classes.length > 0) th.classList.add(...column.classes);
    if (column.classes.includes('customtable-editing')) th.classList.remove('customtable-editing');
    th.innerHTML = column.title;
    if (column.breakpoints) th.dataset.breakpoints = column.breakpoints;
    if (self.state.sorting && column.sortable) handleSortable(th, column);
    column.$el = th;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
  if (self.options.customFunction?.afterDrawHeader) self.options.customFunction.afterDrawHeader.call(self);

  function handleSortable(th: HTMLTableCellElement, column: Column<T>): void {
    th.classList.add('customtable-sortable');
    const span = document.createElement('span');
    span.classList.add('customtableIcon');
    handleSorted(column, th, span);
    th.append(span);
    th.addEventListener('click', (event: MouseEvent): void => {
      const element = <HTMLTableCellElement>(<HTMLTableCellElement>event.target).closest('th');
      handleSortClick(self, element);
    });
  }

  function handleSorted(column: Column<T>, th: HTMLTableCellElement, span: HTMLSpanElement): void {
    if (!column.sorted) return span.classList.add('customtable-sort');
    const direction = column.direction ? column.direction.toLowerCase() : 'asc';
    sortRows(self, column.index, <Directions>direction.toUpperCase());
    th.classList.add(`customtable-${direction}`);
    span.classList.add(direction == 'asc' ? 'customtable-sort-asc' : 'customtable-sort-desc');
  }
}

export function sortRows<T extends CustomTableTypes>(
  self: CustomTable<T>,
  columnIndex: number,
  direction: Directions | null,
): void {
  type ValueType = string | number | boolean | object | Dayjs;

  const Order = getDirectionOrder(direction);
  const rows = self.rows.array;

  const Sorter = (a: Row<T>, b: Row<T>): number => {
    const aColumn = a.columns.array[columnIndex].name;
    const aValue = a.cells[aColumn] as ValueType;

    const bColumn = b.columns.array[columnIndex].name;
    const bValue = b.cells[bColumn] as ValueType;

    // Leere Werte ans Ende sortieren, statt bei 0/false/'' einen Fehler zu werfen.
    const aEmpty = aValue === null || aValue === undefined || aValue === '';
    const bEmpty = bValue === null || bValue === undefined || bValue === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (dayjs.isDayjs(aValue) && dayjs.isDayjs(bValue)) {
      const diff = aValue.valueOf() - bValue.valueOf();
      if (diff === 0) return 0;
      return diff < 0 ? Order[0] : Order[1];
    }

    const normalizedA = normalizeValue(aValue);
    const normalizedB = normalizeValue(bValue);

    return normalizedB.localeCompare(normalizedA, undefined, { numeric: true }) * Order[1];
  };

  rows.sort(Sorter);

  function normalizeValue(value: ValueType): string {
    switch (typeof value) {
      case 'string':
        return value.toLowerCase();
      case 'number':
      case 'boolean':
        return value.toString();
      case 'object':
        return dayjs.isDayjs(value) ? value.toISOString() : JSON.stringify(value);
      default:
        return String(value);
    }
  }

  function getDirectionOrder(direction: Directions | null): number[] {
    const directionOrder = {
      ASC: [1, -1],
      DESC: [-1, 1],
    };
    return direction ? directionOrder[direction] : directionOrder.ASC;
  }
}

export function handleSortClick<T extends CustomTableTypes>(
  self: CustomTable<T>,
  element: HTMLTableCellElement,
): void {
  const column = self.columns.array.find(column => column.$el == element);
  if (!column) throw new Error('Spalte nicht gefunden');
  const direction = column.direction === 'ASC' ? 'DESC' : 'ASC';
  self.columns.array.forEach(column => {
    column.sorted = false;
    column.direction = null;
  });
  column.direction = direction;
  column.sorted = true;
  self.draw();
}
