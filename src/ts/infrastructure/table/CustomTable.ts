/*!
 * Customtable
 *
 * Copyright 2022-2026 Jan Otto
 */
import './customtable.css';
import type { CustomHTMLTableElement } from '@/types';
import { Column, Columns } from './Column';
import { renderFooter, renderHeader, renderRows } from './customTableRender';
import type {
  Breakpoints,
  CustomTableOptions,
  CustomTableOptionsAll,
  CustomTableTypes,
  RowState,
  TableChanges,
} from './customTableTypes';
import { Row } from './Row';
import { Rows } from './Rows';

export { Column, Columns, Row, Rows };
export type { CustomTableTypes, RowState, TableChanges };

export class CustomTable<T extends CustomTableTypes = CustomTableTypes> {
  public $el: CustomHTMLTableElement<T>;
  public table: string;
  public rows: Rows<T>;
  public columns: Columns<T>;
  public state: { editing: boolean | null; sorting: boolean | null };
  private readonly o = { breakpoints: { xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 } };
  public options: CustomTableOptionsAll<T>;

  constructor(initTable: string | CustomHTMLTableElement<T>, options: CustomTableOptions<T>) {
    if (typeof initTable === 'string') {
      this.table = initTable;
      const el = document.querySelector<CustomHTMLTableElement<T>>(`#${initTable}`);
      if (!el) throw new Error('Tabelle nicht gefunden');
      this.$el = el;
    } else if (initTable instanceof HTMLTableElement) {
      this.table = initTable.id;
      this.$el = initTable;
    } else throw new Error('Tabellen Fehler');

    this.$el.instance = this;
    this.options = ApplyOptions.bind(this)(options);
    this.state = setState.bind(this)();

    const thead = this.$el.tHead ?? this.$el.createTHead();
    const tfoot = this.$el.tFoot ?? this.$el.createTFoot();
    if (this.$el.tBodies.length === 0) this.$el.createTBody();

    this.$el.classList.add(...['customtable', ...this.options.classes]);

    if (this.state.editing) {
      const editingRow: CustomTableOptionsAll<T>['columns'][0] = {
        name: 'editing',
        title: '',
        type: 'editing',
        longTitle: '',
        breakpoints: null,
        sortable: false,
        editing: this.options.editing,
        classes: ['customtable-editing'],
        visible: true,
        html: false,
        sorted: false,
        direction: null,
        parser: _parser,
      };
      const maxBreakpoint = this.maxBreakpoint(this.options.columns);
      if (Object.values(this.o.breakpoints).includes(maxBreakpoint)) {
        const index = Object.values(this.o.breakpoints).indexOf(maxBreakpoint);
        if (typeof index === 'number') {
          const breakpoint = Object.keys(this.o.breakpoints)[index];
          editingRow.classes.push(`customtable-toggle-${breakpoint}`);
        }
      }
      this.options.columns.unshift(editingRow);
    }
    this.columns = new Columns(this, this.options.columns);
    this.rows = new Rows<T>(this, this.options.rows);

    this.draw();

    if (tfoot.childNodes.length === 0) this.$el.deleteTFoot();
    if (thead.childNodes.length === 0) this.$el.deleteTHead();

    return this;

    /** It takes an object as an argument and returns an object with the same properties as the argument,
     * but with default values for the properties that are not defined in the argument */
    function ApplyOptions(this: CustomTable<T>, options: CustomTableOptions<T>): CustomTableOptionsAll<T> {
      if (!options.columns) throw new Error('Spalten fehlen');
      return {
        columns: options.columns.map(column => {
          if (!column.name) throw new Error('Spalten Name fehlt');
          return {
            name: column.name,
            title: column.title ?? '',
            longTitle: column.longTitle ?? column.title ?? '',
            breakpoints: column.breakpoints ?? null,
            sortable: column.sortable ?? false,
            sorted: column.sorted ?? false,
            direction: column.direction ?? null,
            type: column.type ?? 'text',
            parser: column.parser ?? _parser,
            classes: column.classes ?? [],
            visible: column.visible ?? true,
            html: column.html ?? false,
          };
        }),
        rows: options.rows ?? [],
        empty: options.empty ?? 'Keine Daten gefunden',
        sorting: {
          enabled: options.sorting?.enabled ?? false,
        },
        editing: {
          enabled: options.editing?.enabled ?? false,
          addText: options.editing?.addText ?? 'Neue Zeile',
          editText:
            options.editing?.editText ??
            '<span class="db-icon db-font-size-sm" data-icon="pen" aria-hidden="true"></span>',
          deleteText:
            options.editing?.deleteText ??
            '<span class="db-icon db-font-size-sm" data-icon="bin" aria-hidden="true"></span>',
          deleteAllText: options.editing?.deleteAllText ?? 'Alle Zeilen löschen',
          addRow:
            options.editing?.addRow ??
            function () {
              return;
            },
          editRow:
            options.editing?.editRow ??
            function () {
              return;
            },
          showRow:
            options.editing?.showRow ??
            function () {
              return;
            },
          deleteRow:
            options.editing?.deleteRow ??
            function () {
              return;
            },
          deleteAllRows: options.editing?.deleteAllRows ?? this.deleteAllRows,
          undoDeleteText:
            options.editing?.undoDeleteText ??
            '<span class="db-icon db-font-size-sm" data-icon="undo" aria-hidden="true"></span>',
          customButton: options.editing?.customButton ?? null,
        },
        classes: options.classes ?? [],
        onChange: options.onChange ?? null,
        customFunction: options.customFunction ?? null,
      };
    }

    function _parser(this: Column<T>, value: unknown): string {
      const s = typeof value === 'number' ? value.toString() : ((value as string) ?? '');
      switch (this.type) {
        case 'text':
        case 'number':
          return s;
        case 'time':
          return s.length > 0 ? s : '--:--';
        default:
          return s;
      }
    }

    /**
     * If the sorting property of the options object is truthy, then return the value of the sorting
     * property of the options object, otherwise return null.
     * @returns The return value is an object with two properties: sorting and editing.
     */
    function setState(this: CustomTable<T>): { sorting: boolean | null; editing: boolean | null } {
      return {
        sorting: this.options.sorting?.enabled ?? null,
        editing: this.options.editing?.enabled ?? null,
      };
    }
  }

  /**
   * It returns an array of the rows in the table.
   * @returns {object[]} An array of rows.
   */
  public getRows(): Row<T>[] {
    return this.rows.array;
  }

  /**
   * It returns an array of arrays, where each inner array is an array of the values of the cells of a
   * row
   * @returns An array of arrays.
   */
  public getArray<T>(): T[] {
    return this.rows.array.map(row => Object.values(row.cells) as T);
  }

  /**
   * It creates all elements for the table
   */
  public draw(): void {
    if (this.options.customFunction?.beforeDraw) this.options.customFunction.beforeDraw.call(this);
    this.drawHeader();
    this.drawFooter();
    this.drawRows();
    if (this.options.customFunction?.afterDraw) this.options.customFunction.afterDraw.call(this);
  }

  /**
   * It creates a footer for the table
   */
  public drawFooter(): void {
    renderFooter(this);
  }

  /**
   * It draws the rows of the table
   */
  public drawRows(): void {
    renderRows(this);
  }

  /**
   * It draws the header of the table
   */
  public drawHeader(): void {
    renderHeader(this);
  }

  /** Benachrichtigt den onChange-Callback (für Auto-Save-Integration) */
  public _notifyChange(): void {
    if (this.options.onChange) this.options.onChange(this);
  }

  private deleteAllRows(): void {
    this.rows.array.length = 0;
    this.draw();
  }

  /**
   * It takes an array of objects, and returns an array of unique values from the "breakpoints" property
   * of each object.
   * @param {} array - The array of columns to get the breakpoints from. If not provided, it will use the
   * columns.array property.
   * @returns {string[]} An array of unique breakpoints.
   */
  public breakpoints(array: Column<T>[] | CustomTableOptionsAll<T>['columns']): Breakpoints[] | [] {
    if (!array) array = this.columns.array;
    return <Breakpoints[] | []>(
      Array.from(new Set(array.map(column => column.breakpoints).flatMap(f => (f ? f.split(' ') : []))))
    );
  }

  /** It returns the largest breakpoint value from an array of breakpoint names */
  public maxBreakpoint(array: Column<T>[] | CustomTableOptionsAll<T>['columns'] = this.columns.array): number {
    return Math.max(...this.breakpoints(array).map(breakpoint => this.o.breakpoints[breakpoint]));
  }
}

export function createCustomTable<T extends CustomTableTypes>(
  table: string | CustomHTMLTableElement<T>,
  options: CustomTableOptions<T>,
): CustomTable<T> {
  return new CustomTable<T>(table, options);
}
