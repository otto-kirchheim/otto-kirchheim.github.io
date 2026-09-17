import type { Columns } from './Column';
import type { CustomTable } from './CustomTable';
import { getEffectiveRowState } from './customTableTypes';
import type {
  CustomHTMLTableRowElement,
  CustomTableTypes,
  DirtyRowState,
  RowRecord,
  RowState,
} from './customTableTypes';

/**
 * `.instance`-Shim für Zeilen (Phase A des `useReducer`-Umbaus): `Row` ist keine Datenklasse
 * mehr, sondern eine dünne, stabile Wrapper-Instanz über einem `RowRecord<T>` im
 * `CustomTable`-Reducer-State. Felder sind Getter (Lesen: `record`-Lookup per `uid`), Methoden
 * dispatchen die passende `TableAction`. `uid` ist der einzige Wert, den diese Klasse selbst
 * hält -- der Rest kommt live aus dem State, damit externe Aufrufer (14 Dateien außerhalb von
 * React, siehe Plan-Dokument) unverändert `row.cells`/`row._state`/... lesen können.
 *
 * Identität bleibt über die Zeit stabil: `Rows.array`s Wrapper-Cache liefert für dieselbe `uid`
 * immer dieselbe `Row`-Instanz zurück (siehe Rows.ts) -- das ist zwingend, weil die 6
 * Editor-Modals eine beim Öffnen gehaltene `Row`-Referenz per `===` gegen einen späteren
 * `.array`-Zugriff vergleichen.
 *
 * Bewusst KEIN `flushExtern` beim Schreiben: Der Reducer-State ist in Phase A ein simples
 * Instanzfeld auf `CustomTable` (`dispatch()` mutiert es synchron, kein React-`useReducer`,
 * kein Batching) -- ein Lesezugriff direkt nach dem Schreiben sieht den neuen Wert bereits
 * ohne Flush. Sobald Achse B den State in einen echten `useReducer`-Hook verschiebt, wird
 * `dispatch` asynchron/batched und externe Lesezugriffe brauchen dann `flushExtern` (siehe
 * Plan-Dokument, Abschnitt ".instance-Shim-Design") -- an dieser Stelle nachtragen.
 */
export class Row<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public columns: Columns<T>;
  public readonly uid: string;
  public $el: CustomHTMLTableRowElement<T> | null = null;

  constructor(table: CustomTable<T>, uid: string) {
    this.CustomTable = table;
    this.columns = table.columns;
    this.uid = uid;
  }

  private get record(): RowRecord<T> {
    const record = this.CustomTable.getRowRecord(this.uid);
    if (!record) {
      throw new Error(`Row: kein RowRecord fuer uid "${this.uid}" - Zeile existiert nicht mehr im State.`);
    }
    return record;
  }

  get cells(): T {
    return this.record.cells;
  }
  set cells(value: T) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: 'cells', value });
  }

  get _id(): string | undefined {
    return this.record._id;
  }
  set _id(value: string | undefined) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_id', value });
  }

  get _state(): RowState {
    return this.record._state;
  }
  set _state(value: RowState) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_state', value });
  }

  get _errorState(): DirtyRowState | undefined {
    return this.record._errorState;
  }
  set _errorState(value: DirtyRowState | undefined) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_errorState', value });
  }

  get _errorMessage(): string | null {
    return this.record._errorMessage;
  }
  set _errorMessage(value: string | null) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_errorMessage', value });
  }

  get _originalCells(): T | undefined {
    return this.record._originalCells;
  }

  get _clientRequestId(): string | undefined {
    return this.record._clientRequestId;
  }
  set _clientRequestId(value: string | undefined) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_clientRequestId', value });
  }

  /** Ist diese Zeile zum Löschen vorgemerkt? */
  get isDeleted(): boolean {
    return getEffectiveRowState(this.record) === 'deleted';
  }

  /** Ist diese Zeile aktuell im Fehlerzustand? */
  get isError(): boolean {
    return this.record._state === 'error';
  }

  /** Hat diese Zeile ungespeicherte Änderungen? */
  get isDirty(): boolean {
    return getEffectiveRowState(this.record) !== 'unchanged';
  }

  /**
   * Soft-Delete: Zeile wird als gelöscht markiert, bleibt aber sichtbar.
   * Durchgestrichen + ausgegraut im UI. Neue (noch nicht gespeicherte) Zeilen werden direkt
   * entfernt (siehe `tableReducer.ts`s `DELETE_ROW`-Case).
   */
  deleteRow(): void {
    this.CustomTable.dispatch({ type: 'DELETE_ROW', uid: this.uid });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Undo: Löschen rückgängig machen.
   */
  undoDelete(): void {
    if (getEffectiveRowState(this.record) !== 'deleted') return;
    this.CustomTable.dispatch({ type: 'UNDO_DELETE', uid: this.uid });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Zelldaten aktualisieren. Setzt State auf 'modified' wenn vorher 'unchanged'.
   * Behält _id bei.
   */
  val(value: T): void {
    this.CustomTable.dispatch({ type: 'UPDATE_CELLS', uid: this.uid, value });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }
}
