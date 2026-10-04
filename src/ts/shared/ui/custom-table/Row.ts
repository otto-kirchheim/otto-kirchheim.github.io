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
 * Stabile Wrapper-Instanz über einem `RowRecord<T>` im `CustomTable`-Reducer-State, damit Aufrufer
 * außerhalb von React weiter `row.cells`/`row._state` lesen und schreiben können. Felder sind Getter
 * (Lookup per `uid` im aktuellen State), Setter und Methoden dispatchen die passende `TableAction`;
 * nur `uid` hält die Klasse selbst.
 *
 * Die Identität bleibt stabil: `Rows.array` liefert für dieselbe `uid` immer dieselbe `Row`-Instanz
 * (Wrapper-Cache in `Rows.ts`). Das ist zwingend, weil die Editor-Modals eine gehaltene `Row` per `===`
 * mit einem späteren `.array`-Zugriff vergleichen.
 *
 * Kein `flushExtern` beim Schreiben: `CustomTable.dispatch()` flusht selbst, sodass ein Lesezugriff
 * direkt nach dem Schreiben bereits den neuen Wert sieht.
 */
export class Row<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public columns: Columns<T>;
  public readonly uid: string;
  public $el: CustomHTMLTableRowElement<T> | null = null;

  /**
   * @param table - Zugehörige Tabelle.
   * @param uid - Eindeutige Zeilen-Id im State.
   */
  constructor(table: CustomTable<T>, uid: string) {
    this.CustomTable = table;
    this.columns = table.columns;
    this.uid = uid;
  }

  /**
   * Der aktuelle `RowRecord` dieser Zeile aus dem State.
   *
   * @throws {Error} Wenn die Zeile nicht mehr im State existiert.
   */
  private get record(): RowRecord<T> {
    const record = this.CustomTable.getRowRecord(this.uid);
    if (!record) {
      throw new Error(`Row: kein RowRecord fuer uid "${this.uid}" - Zeile existiert nicht mehr im State.`);
    }
    return record;
  }

  /** Zellwerte der Zeile. */
  get cells(): T {
    return this.record.cells;
  }
  /**
   * Setzt die Zellwerte direkt (ohne Statuswechsel, anders als `val()`).
   *
   * @param value - Neue Zellwerte.
   */
  set cells(value: T) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: 'cells', value });
  }

  /** Server-Id; `undefined` bei noch nicht gespeicherten Zeilen. */
  get _id(): string | undefined {
    return this.record._id;
  }
  /**
   * Setzt die Server-Id.
   *
   * @param value - Neue Id.
   */
  set _id(value: string | undefined) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_id', value });
  }

  /** Änderungsstatus der Zeile. */
  get _state(): RowState {
    return this.record._state;
  }
  /**
   * Setzt den Änderungsstatus.
   *
   * @param value - Neuer Status.
   */
  set _state(value: RowState) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_state', value });
  }

  /** Status, in dem der Fehler auftrat (für die Rückkehr nach Korrektur). */
  get _errorState(): DirtyRowState | undefined {
    return this.record._errorState;
  }
  /**
   * Setzt den Status vor dem Fehler.
   *
   * @param value - Status oder `undefined`.
   */
  set _errorState(value: DirtyRowState | undefined) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_errorState', value });
  }

  /** Fehlermeldung; `null` ohne Fehler. */
  get _errorMessage(): string | null {
    return this.record._errorMessage;
  }
  /**
   * Setzt die Fehlermeldung.
   *
   * @param value - Meldung oder `null`.
   */
  set _errorMessage(value: string | null) {
    this.CustomTable.dispatch({ type: 'SET_ROW_FIELD', uid: this.uid, field: '_errorMessage', value });
  }

  /** Zellwerte beim Laden bzw. vor der ersten Änderung; `undefined` bei neuen Zeilen. */
  get _originalCells(): T | undefined {
    return this.record._originalCells;
  }

  /** Client-seitige Anfrage-Id der Zeile (Zuordnung beim Speichern). */
  get _clientRequestId(): string | undefined {
    return this.record._clientRequestId;
  }
  /**
   * Setzt die Client-Anfrage-Id.
   *
   * @param value - Id oder `undefined`.
   */
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
   * Soft-Delete: Die Zeile wird als gelöscht markiert und bleibt (durchgestrichen) sichtbar. Neue,
   * noch nicht gespeicherte Zeilen werden direkt entfernt (`DELETE_ROW` in `tableReducer.ts`).
   */
  deleteRow(): void {
    this.CustomTable.dispatch({ type: 'DELETE_ROW', uid: this.uid });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Macht das Löschen rückgängig; tut nichts, wenn die Zeile nicht als gelöscht vorgemerkt ist.
   */
  undoDelete(): void {
    if (getEffectiveRowState(this.record) !== 'deleted') return;
    this.CustomTable.dispatch({ type: 'UNDO_DELETE', uid: this.uid });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Aktualisiert die Zelldaten. Setzt den Status von `unchanged` auf `modified` (`new` bleibt `new`)
   * und übernimmt eine `_id` aus `value`, sonst bleibt die bisherige.
   *
   * @param value - Neue Zellwerte.
   */
  val(value: T): void {
    this.CustomTable.dispatch({ type: 'UPDATE_CELLS', uid: this.uid, value });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }
}
