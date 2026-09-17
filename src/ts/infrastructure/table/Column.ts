import type { CustomTable } from './CustomTable';
import type {
  Breakpoints,
  ColumnRecord,
  CustomTableOptionsAll,
  CustomTableTypes,
  Directions,
} from './customTableTypes';

/**
 * `.instance`-Shim für eine Spalte (Phase A). Anders als `Row` gibt es keine `instanceof
 * Column`/`===`-Abhängigkeit im Code (verifiziert, siehe Plan-Dokument) -- `Columns.array`
 * synthetisiert deshalb bei jedem Zugriff frische `Column`-Instanzen aus dem aktuellen
 * `ColumnRecord<T>[]`, kein Wrapper-Cache nötig. Reines Lese-Objekt: nichts schreibt mehr auf
 * einzelne Column-Felder (die frühere Direktmutation in `CustomTableView.tsx`s
 * `toggleColumnSort()` dispatcht jetzt `TOGGLE_COLUMN_SORT`, siehe dort).
 */
export class Column<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public index: number;
  public $el: HTMLTableCellElement | null = null;
  private readonly record: ColumnRecord<T>;

  constructor(table: CustomTable<T>, record: ColumnRecord<T>, index: number) {
    this.CustomTable = table;
    this.record = record;
    this.index = index;
  }

  get name(): string {
    return this.record.name;
  }
  get title(): string {
    return this.record.title;
  }
  get longTitle(): string {
    return this.record.longTitle;
  }
  get breakpoints(): Breakpoints | null {
    return this.record.breakpoints;
  }
  get sortable(): boolean {
    return this.record.sortable;
  }
  get sorted(): boolean {
    return this.record.sorted;
  }
  get direction(): Directions | null {
    return this.record.direction;
  }
  get type(): string {
    return this.record.type;
  }
  get parser(): (this: Column<T>, value: T[keyof T], option?: unknown) => string | number {
    return this.record.parser;
  }
  get classes(): string[] {
    return this.record.classes;
  }
  get visible(): boolean {
    return this.record.visible;
  }
  get html(): boolean {
    return this.record.html;
  }
  get editing(): CustomTableOptionsAll<T>['editing'] | undefined {
    return this.record.editing;
  }
}

export class Columns<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;

  constructor(table: CustomTable<T>) {
    this.CustomTable = table;
  }

  get array(): Column<T>[] {
    return this.CustomTable.getState().columns.map((record, index) => new Column(this.CustomTable, record, index));
  }
}
