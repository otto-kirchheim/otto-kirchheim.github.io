import type { Column } from './Column';
import type { CustomTable } from './CustomTable';
import type { Row } from './Row';

export type CustomTableTypes = Record<string, unknown>;

/** Status einer Tabellenzeile für Change-Tracking */
export type DirtyRowState = 'new' | 'modified' | 'deleted';
type NonErrorRowState = 'unchanged' | DirtyRowState;

export type RowState = NonErrorRowState | 'error';

export function getEffectiveRowState(row: { _state: RowState; _errorState?: DirtyRowState }): NonErrorRowState {
  return row._state === 'error' ? (row._errorState ?? 'unchanged') : row._state;
}

/** Änderungen einer Tabelle für Bulk-Operationen */
export interface TableChanges<T extends CustomTableTypes> {
  create: T[];
  update: T[];
  delete: string[];
}

export interface CustomTableOptions<T extends CustomTableTypes> {
  columns: {
    name: string;
    title: string;
    longTitle?: string;
    breakpoints?: Breakpoints;
    sortable?: boolean;
    sorted?: boolean;
    direction?: Directions;
    type?: string;
    visible?: boolean;
    parser?: (this: Column<T>, value: T[keyof T], option?: unknown) => string | number;
    classes?: string[];
    /**
     * Nur setzen, wenn der `parser` dieser Spalte nachweislich festes Markup aus
     * dem eigenen Code erzeugt (z.B. ein Schalter). Zellwerte werden dann als
     * HTML eingesetzt — für Spalten mit Freitext aus Benutzereingaben verboten.
     */
    html?: boolean;
    editing?: CustomTableOptions<T>['editing'];
  }[];
  rows: T[];

  empty?: string | (() => string);
  sorting?: { enabled: boolean };
  editing?: {
    enabled: boolean;
    addText?: string;
    editText?: string;
    deleteText?: string;
    deleteAllText?: string;
    undoDeleteText?: string;
    addRow: () => void;
    editRow: (row: Row<T>) => void;
    showRow: (row: Row<T>) => void;
    deleteRow: (row: Row<T>) => void;
    deleteAllRows?: () => void;
    customButton?: { text: string; classes: string[]; function: () => void }[] | null;
  };
  classes?: string[];
  /** Callback bei jeder Datenänderung (für Auto-Save Integration) */
  onChange?: (table: CustomTable<T>) => void;
  customFunction?: {
    beforeDraw?: (this: CustomTable<T>) => void;
    afterDraw?: (this: CustomTable<T>) => void;
    beforeDrawFooter?: (this: CustomTable<T>) => void;
    afterDrawFooter?: (this: CustomTable<T>) => void;
    beforeDrawRows?: (this: CustomTable<T>) => void;
    afterDrawRows?: (this: CustomTable<T>) => void;
    beforeDrawHeader?: (this: CustomTable<T>) => void;
    afterDrawHeader?: (this: CustomTable<T>) => void;
  } | null;
}

export interface CustomTableOptionsAll<T extends CustomTableTypes> {
  columns: {
    name: string;
    title: string;
    longTitle: string;
    breakpoints: Breakpoints | null;
    sortable: boolean;
    sorted: boolean;
    direction: Directions | null;
    type: string;
    parser: (this: Column<T>, value: T[keyof T], option?: unknown) => string | number;
    classes: string[];
    visible: boolean;
    html: boolean;
    editing?: CustomTableOptionsAll<T>['editing'];
  }[];

  rows: T[];

  empty: string | (() => string);
  sorting: { enabled: boolean };
  editing: {
    enabled: boolean;
    addText: string;
    editText: string;
    deleteText: string;
    deleteAllText: string;
    undoDeleteText: string;
    addRow: () => void;
    editRow: (row: Row<T>) => void;
    showRow: (row: Row<T>) => void;
    deleteRow: (row: Row<T>) => void;
    deleteAllRows: () => void;
    customButton: { text: string; classes: string[]; function: () => void }[] | null;
  };
  classes: string[];
  /** Callback bei jeder Datenänderung (für Auto-Save Integration) */
  onChange: ((table: CustomTable<T>) => void) | null;
  customFunction?: {
    beforeDraw?: (this: CustomTable<T>) => void;
    afterDraw?: (this: CustomTable<T>) => void;
    beforeDrawFooter?: (this: CustomTable<T>) => void;
    afterDrawFooter?: (this: CustomTable<T>) => void;
    beforeDrawRows?: (this: CustomTable<T>) => void;
    afterDrawRows?: (this: CustomTable<T>) => void;
    beforeDrawHeader?: (this: CustomTable<T>) => void;
    afterDrawHeader?: (this: CustomTable<T>) => void;
  } | null;
}

export interface CustomHTMLTableRowElement<T extends CustomTableTypes> extends HTMLTableRowElement {
  data?: Row<T>;
}

export type Breakpoints = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type Directions = 'ASC' | 'DESC';
