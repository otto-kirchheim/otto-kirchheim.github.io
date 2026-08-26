import { v4 as uuidv4 } from 'uuid';
import type { Columns } from './Column';
import type { CustomTable } from './CustomTable';
import { getEffectiveRowState } from './customTableTypes';
import type { CustomHTMLTableRowElement, CustomTableTypes, DirtyRowState, RowState } from './customTableTypes';

function createClientRequestId(): string {
  return uuidv4();
}

export class Row<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public columns: Columns<T>;
  public cells: T;
  public $el: CustomHTMLTableRowElement<T> | null = null;

  /** Backend-Dokument-ID (unsichtbar, für Bulk-Operationen) */
  public _id?: string;

  /** Aktueller Änderungsstatus der Zeile */
  public _state: RowState = 'unchanged';

  /** Ursprünglicher Save-State einer Fehlerzeile für Retry-Operationen. */
  public _errorState?: DirtyRowState;

  /** Optionale Fehlermeldung für UI-Markierung und Tooltip. */
  public _errorMessage: string | null = null;

  /** Originalzustand der Zellen (für Diff-Erkennung bei 'modified') */
  public _originalCells?: T;

  /**
   * Frontend-seitige stabile Referenz für Bulk-Create-Zuordnung.
   * Wird nur lokal verwendet und niemals persistiert.
   */
  public _clientRequestId?: string;

  /** Vorheriger State vor dem Löschen (für Undo) */
  private _stateBeforeDelete?: RowState;

  constructor(table: CustomTable<T>, row: T, state: RowState = 'unchanged') {
    this.CustomTable = table;
    this.columns = table.columns;
    this.cells = row;
    this._state = state;

    // _id aus den Zellen extrahieren (falls vorhanden)
    if ('_id' in row && typeof row._id === 'string') {
      this._id = row._id;
    }

    if ('clientRequestId' in row && typeof row.clientRequestId === 'string') {
      this._clientRequestId = row.clientRequestId;
    }

    if (state === 'new' && !this._clientRequestId) {
      this._clientRequestId = createClientRequestId();
    }

    // Original speichern wenn vom Server geladen
    if (state === 'unchanged') {
      this._originalCells = { ...row };
    }
  }

  /** Ist diese Zeile zum Löschen vorgemerkt? */
  get isDeleted(): boolean {
    return getEffectiveRowState(this) === 'deleted';
  }

  /** Ist diese Zeile aktuell im Fehlerzustand? */
  get isError(): boolean {
    return this._state === 'error';
  }

  /** Hat diese Zeile ungespeicherte Änderungen? */
  get isDirty(): boolean {
    return getEffectiveRowState(this) !== 'unchanged';
  }

  /**
   * Soft-Delete: Zeile wird als gelöscht markiert, bleibt aber sichtbar.
   * Durchgestrichen + ausgegraut im UI.
   */
  deleteRow(): void {
    const effectiveState = getEffectiveRowState(this);
    if (effectiveState === 'new') {
      // Neue (noch nicht gespeicherte) Zeilen können direkt entfernt werden
      this.CustomTable.rows.array = this.CustomTable.rows.array.filter(row => row !== this);
    } else {
      // Existierende Zeilen: Soft-Delete
      this._stateBeforeDelete = effectiveState;
      this._state = 'deleted';
      this._errorState = undefined;
      this._errorMessage = null;
    }
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Undo: Löschen rückgängig machen.
   */
  undoDelete(): void {
    if (getEffectiveRowState(this) !== 'deleted') return;
    this._state = this._stateBeforeDelete ?? 'unchanged';
    this._stateBeforeDelete = undefined;
    this._errorState = undefined;
    this._errorMessage = null;
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Zelldaten aktualisieren. Setzt State auf 'modified' wenn vorher 'unchanged'.
   * Behält _id bei.
   */
  val(value: T): void {
    // _id aus neuen Daten übernehmen oder bestehende behalten
    if ('_id' in value && typeof value._id === 'string') {
      this._id = value._id;
    }
    this.cells = value;

    if (this._state === 'error') {
      this._state = this._errorState === 'new' ? 'new' : 'modified';
      this._errorState = undefined;
      this._errorMessage = null;
    } else if (this._state === 'unchanged') {
      this._state = 'modified';
    }
    // 'new' bleibt 'new' (noch nicht gespeichert)
    // 'deleted' bleibt 'deleted' (sollte nicht editiert werden)

    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }
}
