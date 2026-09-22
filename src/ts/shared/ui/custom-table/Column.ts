import type { CustomTable } from './CustomTable';
import type {
  Breakpoints,
  ColumnRecord,
  CustomTableOptionsAll,
  CustomTableTypes,
  Directions,
} from './customTableTypes';

/**
 * Lesesicht auf eine Spalte des `CustomTable`-Reducer-States. Anders als bei `Row` verlässt sich
 * niemand auf die Identität einer `Column`, deshalb baut `Columns.array` bei jedem Zugriff frische
 * Instanzen aus dem aktuellen `ColumnRecord<T>[]` (kein Wrapper-Cache). Es gibt keine Setter:
 * Änderungen laufen über `TableAction`s (z.B. `TOGGLE_COLUMN_SORT`).
 */
export class Column<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public index: number;
  public $el: HTMLTableCellElement | null = null;
  private readonly record: ColumnRecord<T>;

  /**
   * @param table - Zugehörige Tabelle.
   * @param record - Spaltendaten aus dem State.
   * @param index - Position der Spalte in der Tabelle.
   */
  constructor(table: CustomTable<T>, record: ColumnRecord<T>, index: number) {
    this.CustomTable = table;
    this.record = record;
    this.index = index;
  }

  /** Technischer Name der Spalte (Feldname in den Zellen). */
  get name(): string {
    return this.record.name;
  }
  /** Kurzer Anzeigetitel. */
  get title(): string {
    return this.record.title;
  }
  /** Langer Titel; fällt auf `title` zurück. */
  get longTitle(): string {
    return this.record.longTitle;
  }
  /** Stufe, unterhalb derer die Spalte ausgeblendet wird (`data-breakpoints`); `null` = immer sichtbar. */
  get breakpoints(): Breakpoints | null {
    return this.record.breakpoints;
  }
  /** Ist die Spalte sortierbar? */
  get sortable(): boolean {
    return this.record.sortable;
  }
  /** Ist die Tabelle aktuell nach dieser Spalte sortiert? */
  get sorted(): boolean {
    return this.record.sorted;
  }
  /** Sortierrichtung; `null`, wenn nicht sortiert. */
  get direction(): Directions | null {
    return this.record.direction;
  }
  /** Spaltentyp; Standard `'text'`. */
  get type(): string {
    return this.record.type;
  }
  /** Wandelt einen Zellwert in den Anzeigewert (Text oder Zahl). */
  get parser(): (this: Column<T>, value: T[keyof T], option?: unknown) => string | number {
    return this.record.parser;
  }
  /** CSS-Klassen der Spalte. */
  get classes(): string[] {
    return this.record.classes;
  }
  /** Ist die Spalte sichtbar? */
  get visible(): boolean {
    return this.record.visible;
  }
  /** Liefert der `parser` JSX statt Text? */
  get html(): boolean {
    return this.record.html;
  }
  /** Aktions-Spalte (Bearbeiten/Löschen) mit deren Optionen; sonst `undefined`. */
  get editing(): CustomTableOptionsAll<T>['editing'] | undefined {
    return this.record.editing;
  }
}

/** Zugriff auf die Spalten einer Tabelle als `Column`-Instanzen. */
export class Columns<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;

  /**
   * @param table - Tabelle, deren Spalten gelesen werden.
   */
  constructor(table: CustomTable<T>) {
    this.CustomTable = table;
  }

  /** Alle Spalten in Tabellenreihenfolge, bei jedem Zugriff neu aus dem aktuellen State gebildet. */
  get array(): Column<T>[] {
    return this.CustomTable.getState().columns.map((record, index) => new Column(this.CustomTable, record, index));
  }
}
