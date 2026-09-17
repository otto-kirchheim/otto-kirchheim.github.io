import type { CustomTable } from './CustomTable';
import { getEffectiveRowState } from './customTableTypes';
import type { CustomTableTypes, RowRecord, RowState, TableChanges } from './customTableTypes';
import { Row } from './Row';

const NON_ERROR_ROW_STATES: readonly RowState[] = ['unchanged', 'new', 'modified', 'deleted'];

/**
 * `.instance`-Shim für die Zeilen-Sammlung (Phase A). Hält KEINEN eigenen Zustand mehr außer
 * dem Row-Wrapper-Cache (`uid` -> stabile `Row`-Instanz, siehe `Row.ts`s Docblock) -- die
 * eigentlichen Daten leben im `RowRecord<T>[]` auf `CustomTable`s Reducer-State. Jede Methode
 * dispatcht die passende `TableAction` und stellt anschließend exakt dieselben
 * `drawRows()`/`_notifyChange()`-Aufrufe wie vorher her.
 */
export class Rows<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  private readonly wrapperCache = new Map<string, Row<T>>();
  private cachedArrayFor: RowRecord<T>[] | null = null;
  private cachedArray: Row<T>[] = [];

  constructor(table: CustomTable<T>) {
    this.CustomTable = table;
  }

  /**
   * Projiziert `CustomTable.getState().rows` (RowRecord[]) auf stabile `Row`-Wrapper.
   * Gecached anhand der Referenzidentität von `state.rows`: Solange kein `dispatch()`
   * stattfand (neuer Array-Wert), liefert ein zweiter `.array`-Zugriff dieselbe Array-Instanz
   * zurück -- das erhält den alten, mutierbaren-Array-Vertrag, den `CustomTableView.tsx`s
   * In-Render-Sortierung (`table.rows.array.sort(...)`) braucht (siehe dort).
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

  /** Neue Zeile hinzufügen (State: 'new') */
  add(value: T, state: RowState = 'new'): void {
    this.CustomTable.dispatch({ type: 'ADD', value, state });
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Zeilen laden mit vollständiger State-Restauration aus Meta-Feldern (siehe
   * `tableReducer.ts`s `LOAD`-Case). `hasPendingChanges` wird wie im alten Code VOR dem
   * eigentlichen Laden anhand der Rohdaten ermittelt (Fehler-Zeilen zählen bewusst nicht mit).
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

  /** @deprecated Identisches Verhalten wie rows.load() seit Vereinheitlichung */
  loadSmart(array: T[]): void {
    this.load(array);
  }

  /** Setzt/entfernt einen unsichtbaren Zeilenfilter und zeichnet die Tabelle neu. */
  setFilter(filter: ((cells: T) => boolean) | null): void {
    this.CustomTable.dispatch({ type: 'SET_FILTER', filter });
    this.CustomTable.drawRows();
  }

  /** Liefert die aktuell sichtbaren Zeilen unter Berücksichtigung des aktiven Filters. */
  getFilteredRows(): Array<Row<T>> {
    const filter = this.CustomTable.getState().rowFilter;
    if (!filter) return this.array;
    return this.array.filter(row => filter(row.cells));
  }

  /**
   * Liefert die Row-Referenzen hinter den aktuellen Änderungen (statt Zellen-Kopien).
   * Einzige Quelle der Zustands-Filterung für `getChanges()` und für den Commit nach
   * einem Bulk-Save: Ein Snapshot dieser Referenzen (vor dem `await` des Requests
   * genommen) legt fest, welche Zeilen beim Commit ueberhaupt angefasst werden duerfen
   * - Zeilen, die erst waehrend der laufenden Anfrage neu angelegt/geaendert wurden,
   * sind darin nicht enthalten und bleiben dadurch unangetastet (siehe AutoSave-Commit-Race).
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
   * @param includeDeletes - Löschungen einbeziehen? (Default: true).
   *   Auto-Save ruft mit `false` auf, manuelles Speichern mit `true`.
   * @returns { create: T[], update: T[], delete: string[] }
   */
  getChanges(includeDeletes = true): TableChanges<T> {
    const rows = this.getChangeRows(includeDeletes);
    return {
      create: rows.create.map(row => ({ ...row.cells })),
      update: rows.update.map(row => ({ ...row.cells, _id: row._id }) as T),
      delete: rows.delete.map(row => row._id as string),
    };
  }

  /** Gibt es ungespeicherte Änderungen (ohne Löschungen)? */
  get hasAutoSaveChanges(): boolean {
    return this.array.some(row => {
      const effectiveState = getEffectiveRowState(row);
      return effectiveState === 'new' || effectiveState === 'modified';
    });
  }

  /** Gibt es irgendwelche ungespeicherte Änderungen (inkl. Löschungen)? */
  get hasChanges(): boolean {
    return this.array.some(row => row._state !== 'unchanged');
  }

  /** Gibt es vorgemerkte Löschungen? */
  get hasPendingDeletes(): boolean {
    return this.array.some(row => getEffectiveRowState(row) === 'deleted');
  }

  /**
   * Alle bestehenden Zeilen soft-deleten.
   * Neue Zeilen (noch nicht im Backend) werden direkt entfernt.
   * Existierende Zeilen werden als 'deleted' markiert.
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
   * Nach erfolgreichem manuellen Speichern (inkl. Löschungen): Alle States zurücksetzen.
   * @param createdIds - Mapping von Index → neue _id für erstellte Einträge
   * @param failedRows - Schlüssel (`getRowKey()`) der Zeilen, deren Save fehlgeschlagen ist.
   * @param includedRows - Schlüssel-Snapshot aus `getChangeRows()` (per `getRowKey()`) vor dem
   *   Request. Nur diese Zeilen werden committet/entfernt (AutoSave-Commit-Race, siehe oben).
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
   * Nach erfolgreichem Auto-Save (OHNE Löschungen): Nur new/modified zurücksetzen.
   * Gelöschte Zeilen bleiben als 'deleted' sichtbar.
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
   * Aktualisiert die Zellen aller nicht-gelöschten Zeilen anhand von `transform` (liefert
   * `null` für unveränderte Zeilen zurück). Fasst NUR die Zellen an, nicht den State. Ruft
   * bewusst kein `drawRows()` -- der Aufrufer entscheidet über die Redraw-Bedingung.
   * @returns ob irgendeine Zeile betroffen war.
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
   * @returns ob irgendeine Zeile betroffen war.
   */
  patchCellsAsModified(transform: (row: RowRecord<T>) => T | null): boolean {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'PATCH_CELLS_AS_MODIFIED', transform });
    const after = this.CustomTable.getState().rows;
    return before.some((row, i) => row !== after[i]);
  }

  /** Sucht eine Zeile per Backend-`_id`. */
  findById(id: string | undefined): Row<T> | undefined {
    if (!id) return undefined;
    return this.array.find(row => row._id === id);
  }

  /**
   * Markiert alle nicht bereits gelöschten Zeilen, deren Zellen `matcher` erfüllen, als lokal
   * geändert -- State-only, KEINE Zellen-Änderung. `new` bleibt `new`, alles andere wird
   * `modified`. Ruft bewusst kein `drawRows()`.
   * @returns Anzahl der markierten Zeilen.
   */
  markRowsDirtyByMatch(matcher: (cells: T) => boolean): number {
    const before = this.CustomTable.getState().rows;
    this.CustomTable.dispatch({ type: 'MARK_DIRTY_BY_MATCH', matcher });
    const after = this.CustomTable.getState().rows;
    return before.filter((row, i) => row !== after[i]).length;
  }

  /**
   * Reconciled den Bestand gegen `serverRows`, eingeschränkt auf Zeilen/Server-Einträge, die
   * `matcher` erfüllen (siehe `tableReducer.ts`s `RECONCILE_DELETED`-Case für die genaue
   * Semantik). Ruft KEIN `drawRows()`.
   * @returns Anzahl betroffener Zeilen.
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
