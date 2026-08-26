import type { CustomTable } from './CustomTable';
import type { Breakpoints, CustomTableOptionsAll, CustomTableTypes, Directions } from './customTableTypes';

export class Column<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public name: string;
  public title: string;
  public longTitle: string;
  public breakpoints: Breakpoints | null;
  public sortable: boolean;
  public sorted: boolean;
  public direction: Directions | null;
  public type: string;
  public parser: (this: Column<T>, value: T[keyof T], option?: unknown) => string | number;
  public classes: string[];
  public visible: boolean;
  public html: boolean;
  public editing?: CustomTableOptionsAll<T>['editing'] | null;
  public index: number;
  public $el: HTMLTableCellElement | null = null;
  constructor(table: CustomTable<T>, column: CustomTableOptionsAll<T>['columns'][0], index: number) {
    if (!column.name) throw new Error('Name fehlt');
    if (!column.title && !column.editing) throw new Error('Title fehlt');
    this.index = index;
    this.name = column.name;
    this.title = column.title;
    this.longTitle = column.longTitle ?? column.title ?? '';
    this.breakpoints = column.breakpoints;
    this.sortable = column.sortable;
    this.sorted = column.sorted;
    this.direction = column.direction;
    this.type = column.type;
    this.parser = column.parser;
    this.classes = column.classes;
    this.visible = column.visible;
    this.html = column.html;
    if (column.editing) this.editing = column.editing;
    this.CustomTable = table;
  }
}
export class Columns<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public array: Column<T>[] = [];

  constructor(table: CustomTable<T>, columns: CustomTableOptionsAll<T>['columns']) {
    this.array = columns.map((column, index) => new Column(table, column, index));
    this.CustomTable = table;
  }
}
