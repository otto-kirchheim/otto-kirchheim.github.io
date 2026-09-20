import type { Column } from './Column';
import type { CustomTable } from './CustomTable';
import type { Row } from './Row';
import type { DbButtonLook } from '../ui/dbButton';
import type { BreakpointName } from '../ui/breakpoints';

export type CustomTableTypes = Record<string, unknown>;

/** Status einer Tabellenzeile für Change-Tracking */
export type DirtyRowState = 'new' | 'modified' | 'deleted';
type NonErrorRowState = 'unchanged' | DirtyRowState;

export type RowState = NonErrorRowState | 'error';

/**
 * Liefert den Zustand ohne Fehlerhülle: Fehler-Zeilen zählen mit ihrem `_errorState` (Standard
 * `'unchanged'`), alle anderen mit `_state`.
 *
 * @param row - Zeile bzw. `RowRecord` mit `_state` und optional `_errorState`.
 * @returns Zustand ohne `'error'`.
 */
export function getEffectiveRowState(row: { _state: RowState; _errorState?: DirtyRowState }): NonErrorRowState {
  return row._state === 'error' ? (row._errorState ?? 'unchanged') : row._state;
}

/**
 * Stabiler, ID-basierter Schlüssel für eine Zeile — Ersatz für Objektidentitäts-Vergleiche
 * (`Set<Row>.has(row)`) über asynchrone Grenzen hinweg (AutoSave-Commit-Race). `new`-Zeilen
 * (auch im Fehlerzustand mit `_errorState === 'new'`) nutzen `_clientRequestId` (wird von
 * `createRowRecord()` für `new` immer vergeben); alle anderen nutzen `_id` (für `modified`/
 * `deleted` durch `getChangeRows()` bereits garantiert vorhanden). Wirft bei Verletzung dieser
 * Invariante bewusst, statt eine falsche Zeile zufällig zu matchen.
 *
 * @param row - Zeile bzw. `RowRecord` mit State und `_id`/`_clientRequestId`.
 * @returns `new:<_clientRequestId>` oder `id:<_id>`.
 * @throws {Error} Wenn die dafür nötige ID fehlt.
 */
export function getRowKey(row: {
  _state: RowState;
  _errorState?: DirtyRowState;
  _id?: string;
  _clientRequestId?: string;
}): string {
  const effectiveState = getEffectiveRowState(row);
  if (effectiveState === 'new') {
    if (!row._clientRequestId) {
      throw new Error('getRowKey: Zeile im State "new" ohne _clientRequestId - inkonsistenter Row-State.');
    }
    return `new:${row._clientRequestId}`;
  }
  if (!row._id) {
    throw new Error(`getRowKey: Zeile im State "${effectiveState}" ohne _id - inkonsistenter Row-State.`);
  }
  return `id:${row._id}`;
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
     * Nur setzen, wenn der `parser` dieser Spalte JSX statt eines Textwerts zurueckgibt
     * (z. B. ein Schalter) -- fuer Spalten mit Freitext aus Benutzereingaben verboten.
     * `CustomTableView.tsx` rendert den Rueckgabewert dann direkt statt ihn zu `String()`en.
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
    customButton?: { text: string; look?: DbButtonLook; function: () => void }[] | null;
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
    customButton: { text: string; look?: DbButtonLook; function: () => void }[] | null;
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

export type Breakpoints = BreakpointName;
export type Directions = 'ASC' | 'DESC';

// ─── Reducer-Kern ──────────────────────────────────────────────────────────
//
// Reine, serialisierbare Datenform einer Zeile/Spalte für den Reducer-Kern. KEINE Klasse, kein
// DOM-/Table-Backref -- der `.instance`-Shim (`Row`/`Rows`/`Column`/`Columns` in Row.ts/Rows.ts/
// Column.ts) baut die nach außen sichtbare Klassen-API darüber.
//
// `uid` ist UNABHÄNGIG von `getRowKey()`: ein permanenter, intern vergebener Cache-Schlüssel für
// die Row-Shim-Instanz (die Editor-Modals vergleichen gehaltene `Row`-Referenzen per `===`), der
// sich über die Lebenszeit der Zeile nie ändert. `getRowKey()` dient nur dem AutoSave-Commit-
// Race-Abgleich und ändert sich bewusst bei new -> unchanged.

export interface RowRecord<T extends CustomTableTypes> {
  uid: string;
  cells: T;
  _id?: string;
  _state: RowState;
  _errorState?: DirtyRowState;
  _errorMessage: string | null;
  _originalCells?: T;
  _clientRequestId?: string;
  _stateBeforeDelete?: RowState;
}

export interface ColumnRecord<T extends CustomTableTypes> {
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
}

export interface TableReducerState<T extends CustomTableTypes> {
  rows: RowRecord<T>[];
  columns: ColumnRecord<T>[];
  rowFilter: ((cells: T) => boolean) | null;
  editingEnabled: boolean | null;
  sortingEnabled: boolean | null;
}

export type TableAction<T extends CustomTableTypes> =
  | { type: 'ADD'; value: T; state?: RowState } // Rows.add()
  | { type: 'LOAD'; rows: T[]; add?: boolean } // Rows.load()/loadSmart()
  | { type: 'SET_FILTER'; filter: ((cells: T) => boolean) | null } // Rows.setFilter()
  | { type: 'UPDATE_CELLS'; uid: string; value: T } // Row.val()
  | { type: 'DELETE_ROW'; uid: string } // Row.deleteRow()
  | { type: 'UNDO_DELETE'; uid: string } // Row.undoDelete()
  | {
      // Escape-Hatch für Direktzuweisungen auf Row-Felder (`row._state = ...` u.ä.) außerhalb von
      // val()/deleteRow()/undoDelete() -- z.B. in `submitBereitschaftsEinsatz.ts` und den
      // AutoSave-Fehlerpfaden (`errorHandling.ts`). Kein Vorbild für neuen Code: neue
      // Schreibzugriffe gehören in eine eigene TableAction.
      type: 'SET_ROW_FIELD';
      uid: string;
      field: '_state' | '_errorState' | '_errorMessage' | '_id' | '_clientRequestId' | 'cells';
      value: unknown;
    }
  | { type: 'DELETE_ALL' } // Rows.deleteAll()
  | {
      type: 'COMMIT_CHANGES'; // Rows.commitChanges()
      createdIds?: Map<number, string>;
      failedRowKeys: ReadonlySet<string>;
      includedRowKeys?: ReadonlySet<string>;
    }
  | {
      type: 'COMMIT_AUTO_SAVE'; // Rows.commitAutoSave()
      createdIds?: Map<number, string>;
      failedRowKeys: ReadonlySet<string>;
      includedRowKeys?: ReadonlySet<string>;
    }
  | { type: 'SYNC_CELLS_SILENTLY'; transform: (row: RowRecord<T>) => T | null } // Rows.syncCellsSilently()
  | { type: 'PATCH_CELLS_AS_MODIFIED'; transform: (row: RowRecord<T>) => T | null } // Rows.patchCellsAsModified()
  | { type: 'MARK_DIRTY_BY_MATCH'; matcher: (cells: T) => boolean } // Rows.markRowsDirtyByMatch()
  | { type: 'RECONCILE_DELETED'; serverRows: T[]; matcher: (cells: T) => boolean } // Rows.reconcileDeletedRows()
  | { type: 'TOGGLE_COLUMN_SORT'; columnName: string }; // CustomTableView.tsx toggleColumnSort()
