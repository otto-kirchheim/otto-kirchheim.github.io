import type { CustomTable } from './CustomTable';
import { getEffectiveRowState } from './customTableTypes';
import type { CustomTableTypes, RowRecord, RowState, TableChanges } from './customTableTypes';
import { Row } from './Row';

const NON_ERROR_ROW_STATES: readonly RowState[] = ['unchanged', 'new', 'modified', 'deleted'];

/**
 * `.instance`-Shim für die Zeilen-Sammlung. Hält außer dem Row-Wrapper-Cache (`uid` -> stabile
 * `Row`-Instanz, siehe `Row.ts`) keinen eigenen Zustand -- die Daten leben im `RowRecord<T>[]`
 * auf `CustomTable`s Reducer-State. Jede Methode dispatcht die passende `TableAction` und löst
 * danach ggf. `drawRows()`/`_notifyChange()` aus.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 */
export class Rows<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  private readonly wrapperCache = new Map<string, Row<T>>();
  private cachedArrayFor: RowRecord<T>[] | null = null;
  private cachedArray: Row<T>[] = [];

  /**
   * Bindet die Sammlung an ihre Tabelle.
   *
   * @param table - Besitzende `CustomTable`, deren Reducer-State gelesen/dispatcht wird.
   */
  constructor(table: CustomTable<T>) {
    this.CustomTable = table;
  }

  /**
   * Projiziert `CustomTable.getState().rows` (RowRecord[]) auf stabile `Row`-Wrapper.
   * Gecached anhand der Referenzidentität von `state.rows`: Solange kein `dispatch()`
   * stattfand, liefert ein zweiter `.array`-Zugriff dieselbe Array-Instanz -- die In-Render-
   * Sortierung in `CustomTableView.tsx` (`table.rows.array.sort(...)`) verlässt sich darauf.
   */
  get array(): Row<T>[] {
    const stateRows = this.CustomTable.getState().rows;
    if (this.cachedArrayFor === stateRows) return this.cachedArray;

    const validUids = new Set(stateRows.map(r => r.uid));
    for (const uid of this.wrapperCache.keys()) {
      if (!validUids.has(uid)) this.wrapperCache.delete(uid);
    }

    this.cachedArray = stateRows.map(record => {
      let wrapper = this.wrapperCache.get(record.uid);
      if (!wrapper) {
        wrapper = new Row(this.CustomTable, record.uid);
        this.wrapperCache.set(record.uid, wrapper);
      }
      return wrapper;
    });
    this.cachedArrayFor = stateRows;
    return this.cachedArray;
  }

  /**
   * Fügt eine Zeile hinzu und zeichnet neu.
   *
   * @param value - Zellenwerte der neuen Zeile.
   * @param state - Anfangszustand; Standard `'new'`.
   */
  add(value: T, state: RowState = 'new'): void {
    this.CustomTable.dispatch({ type: 'ADD', value, state });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Lädt Zeilen und restauriert den State aus den Meta-Feldern (siehe `LOAD`-Case in
   * `tableReducer.ts`). `hasPendingChanges` wird VOR dem Laden aus den Rohdaten ermittelt;
   * Fehler-Zeilen zählen bewusst nicht mit. Nur dann wird `_notifyChange()` ausgelöst.
   *
   * @param array - Zeilendaten, ggf. mit `__localState`/`__errorMessage`/`__errorState`.
   * @param add - `true` hängt an den Bestand an, sonst wird er ersetzt.
   */
  load(array: T[], add = false): void {
    const hasPendingChanges = array.some(row => {
      const r = row as Record<string, unknown>;
      if (r.__errorMessage) return false;
      const storedLocalState = r.__localState as string | undefined;
      const hasId = '_id' in r && typeof r._id === 'string';
      const baseState: RowState = NON_ERROR_ROW_STATES.includes(storedLocalState as RowState)
        ? (storedLocalState as RowState)
        : hasId
          ? 'unchanged'
          : 'new';
      return baseState === 'new' || baseState === 'modified';
    });

    this.CustomTable.dispatch({ type: 'LOAD', rows: array, add });
    this.CustomTable.drawRows();
    if (hasPendingChanges) this.CustomTable._notifyChange();
  }

  /**
   * @deprecated Identisch zu `load()`.
   *
   * @param array - Zeilendaten, siehe `load()`.
   */
  loadSmart(array: T[]): void {
    this.load(array);
  }

  /**
   * Setzt/entfernt einen unsichtbaren Zeilenfilter und zeichnet die Tabelle neu.
   *
   * @param filter - Prädikat auf den Zellen; `null` entfernt den Filter.
   */
  setFilter(filter: ((cells: T) => boolean) | null): void {
    this.CustomTable.dispatch({ type: 'SET_FILTER', filter });
    this.CustomTable.drawRows();
  }

  /**
   * Liefert die Zeilen, die der aktive Filter durchlässt.
   *
   * @returns Alle Zeilen, wenn kein Filter gesetzt ist.
   */
  getFilteredRows(): Array<Row<T>> {
    const filter = this.CustomTable.getState().rowFilter;
    if (!filter) return this.array;
    return this.array.filter(row => filter(row.cells));
  }

  /**
   * Liefert die Row-Referenzen hinter den aktuellen Änderungen (statt Zellen-Kopien).
   * Einzige Quelle der Zustands-Filterung für `getChanges()` und den Commit nach einem
   * Bulk-Save: Ein vor dem `await` des Requests genommener Snapshot legt fest, welche Zeilen
   * der Commit anfassen darf. Erst während der Anfrage neu angelegte/geänderte Zeilen sind
   * darin nicht enthalten und bleiben unangetastet (AutoSave-Commit-Race).
   *
   * @param includeDeletes - Gelöschte Zeilen (mit `_id`) einbeziehen; Standard `true`.
   * @returns Zeilen gruppiert nach `create`/`update`/`delete`.
   */
  getChangeRows(includeDeletes = true): { create: Row<T>[]; update: Row<T>[]; delete: Row<T>[] } {
    const create: Row<T>[] = [];
    const update: Row<T>[] = [];
    const del: Row<T>[] = [];

    for (const row of this.array) {
      switch (getEffectiveRowState(row)) {
        case 'new':
          create.push(row);
          break;
        case 'modified':
          if (row._id) update.push(row);
          break;
        case 'deleted':
          if (includeDeletes && row._id) del.push(row);
          break;
      }
    }

    return { create, update, delete: del };
  }

  /**
   * Ermittelt alle Änderungen für eine Bulk-Operation.
   *
   * @param includeDeletes - Löschungen einbeziehen; Standard `true`. Auto-Save ruft mit
   *   `false` auf, manuelles Speichern mit `true`.
   * @returns Zellen-Kopien für `create`/`update` (mit `_id`), `_id`s für `delete`.
   */
  getChanges(includeDeletes = true): TableChanges<T> {
    const rows = this.getChangeRows(includeDeletes);
    return {
      create: rows.create.map(row => ({ ...row.cells })),
      update: rows.update.map(row => ({ ...row.cells, _id: row._id }) as T),
      delete: rows.delete.map(row => row._id as string),
    };
  }

  /** Gibt es ungespeicherte neue/geänderte Zeilen (ohne Löschungen)? */
  get hasAutoSaveChanges(): boolean {
    return this.array.some(row => {
      const effectiveState = getEffectiveRowState(row);
      return effectiveState === 'new' || effectiveState === 'modified';
    });
  }

  /** Gibt es irgendwelche ungespeicherten Änderungen (inkl. Löschungen)? */
  get hasChanges(): boolean {
    return this.array.some(row => row._state !== 'unchanged');
  }

  /** Gibt es vorgemerkte Löschungen? */
  get hasPendingDeletes(): boolean {
    return this.array.some(row => getEffectiveRowState(row) === 'deleted');
  }

  /**
   * Löscht alle Zeilen vor: neue Zeilen (noch nicht im Backend) werden direkt entfernt, alle
   * anderen als `'deleted'` markiert. `_notifyChange()` nur, wenn sich etwas geändert hat.
   */
  deleteAll(): void {
    const before = this.CustomTable.getState().rows;
    const hasRemovedRows = before.some(row => getEffectiveRowState(row) === 'new');
    const hasSoftDeletes = before.some(row => {
      const effectiveState = getEffectiveRowState(row);
      return effectiveState !== 'new' && effectiveState !== 'deleted';
    });

    this.CustomTable.dispatch({ type: 'DELETE_ALL' });
    this.CustomTable.drawRows();
    if (hasRemovedRows || hasSoftDeletes) this.CustomTable._notifyChange();
  }

  /**
   * Nach erfolgreichem manuellen Speichern (inkl. Löschungen): setzt die States zurück und
   * entfernt gespeicherte Löschungen.
   *
   * @param createdIds - Index unter den neuen Zeilen -> vom Backend vergebene `_id`.
   * @param failedRows - Schlüssel (`getRowKey()`) der Zeilen, deren Save fehlgeschlagen ist.
   * @param includedRows - Schlüssel-Snapshot aus `getChangeRows()` vor dem Request. Nur diese
   *   Zeilen werden committet/entfernt (AutoSave-Commit-Race); ohne Angabe alle.
   */
  commitChanges(
    createdIds?: Map<number, string>,
    failedRows: ReadonlySet<string> = new Set<string>(),
    includedRows?: ReadonlySet<string>,
  ): void {
    this.CustomTable.dispatch({
      type: 'COMMIT_CHANGES',
      createdIds,
      failedRowKeys: failedRows,
      includedRowKeys: includedRows,
    });
    this.CustomTable.drawRows();
  }

  /**
   * Nach erfolgreichem Auto-Save (OHNE Löschungen): setzt nur new/modified zurück; gelöschte
   * Zeilen bleiben als `'deleted'` sichtbar.
   *
   * @param createdIds - Index unter den neuen Zeilen -> vom Backend vergebene `_id`.
   * @param failedRows - Schlüssel (`getRowKey()`) der Zeilen, deren Save fehlgeschlagen ist.
   * @param includedRows - Schlüssel-Snapshot aus `getChangeRows()` vor dem Request; ohne Angabe alle.
   */
  commitAutoSave(
    createdIds?: Map<number, string>,
    failedRows: ReadonlySet<string> = new Set<string>(),
    includedRows?: ReadonlySet<string>,
  ): void {
    this.CustomTable.dispatch({
      type: 'COMMIT_AUTO_SAVE',
      createdIds,
      failedRowKeys: failedRows,
      includedRowKeys: includedRows,
    });
    this.CustomTable.drawRows();
  }

  /**
   * Aktualisiert die Zellen aller nicht-gelöschten Zeilen per `transform`; `unchanged`-Zeilen
   * bleiben `unchanged` (die Original-Zellen werden mitgezogen). Ruft bewusst kein `drawRows()`
   * -- der Aufrufer entscheidet über den Redraw.
   *
   * @param transform - Liefert neue Zellen je Zeile, `null` für unveränderte Zeilen.
   * @returns `true`, wenn irgendeine Zeile betroffen war.
   */
  syncCellsSilently(transform: (row: RowRecord<T>) => T | null): boolean {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'SYNC_CELLS_SILENTLY', transform });
    const after = this.CustomTable.getState().rows;
    return before.some((row, i) => row !== after[i]);
  }

  /**
   * Wendet `transform` auf die Zellen aller nicht-gelöschten Zeilen an und markiert eine vorher
   * `unchanged` Zeile als `modified`. Ruft bewusst kein `drawRows()`, siehe `syncCellsSilently()`.
   *
   * @param transform - Liefert neue Zellen je Zeile, `null` für unveränderte Zeilen.
   * @returns `true`, wenn irgendeine Zeile betroffen war.
   */
  patchCellsAsModified(transform: (row: RowRecord<T>) => T | null): boolean {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'PATCH_CELLS_AS_MODIFIED', transform });
    const after = this.CustomTable.getState().rows;
    return before.some((row, i) => row !== after[i]);
  }

  /**
   * Sucht eine Zeile per Backend-`_id`.
   *
   * @param id - Backend-`_id`.
   * @returns Die Zeile oder `undefined` (auch bei leerer/fehlender `id`).
   */
  findById(id: string | undefined): Row<T> | undefined {
    if (!id) return undefined;
    return this.array.find(row => row._id === id);
  }

  /**
   * Markiert alle nicht gelöschten Zeilen, deren Zellen `matcher` erfüllen, als lokal geändert
   * -- nur der State, die Zellen bleiben. Zeilen ohne `_id` werden `new`, alle anderen
   * `modified`. Ruft bewusst kein `drawRows()`.
   *
   * @param matcher - Prädikat auf den Zellen einer Zeile.
   * @returns Anzahl der markierten Zeilen.
   */
  markRowsDirtyByMatch(matcher: (cells: T) => boolean): number {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'MARK_DIRTY_BY_MATCH', matcher });
    const after = this.CustomTable.getState().rows;
    return before.filter((row, i) => row !== after[i]).length;
  }

  /**
   * Gleicht den Bestand gegen `serverRows` ab, eingeschränkt auf Zeilen/Server-Einträge, die
   * `matcher` erfüllen (Semantik: `RECONCILE_DELETED`-Case in `tableReducer.ts`). Ruft kein
   * `drawRows()`.
   *
   * @param serverRows - Aktueller Serverbestand.
   * @param matcher - Prädikat auf den Zellen; begrenzt den Abgleich auf einen Teilbestand.
   * @returns Anzahl geänderter plus hinzugekommener Zeilen.
   */
  reconcileDeletedRows(serverRows: T[], matcher: (cells: T) => boolean): number {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'RECONCILE_DELETED', serverRows, matcher });
    const after = this.CustomTable.getState().rows;

    let count = 0;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) count++;
    }
    count += after.length - before.length;
    return count;
  }
}
