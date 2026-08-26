import { stripMetaFields } from '../data/metaFields';
import type { CustomTable } from './CustomTable';
import { getEffectiveRowState } from './customTableTypes';
import type { CustomTableTypes, DirtyRowState, RowState, TableChanges } from './customTableTypes';
import { Row } from './Row';

const NON_ERROR_ROW_STATES: readonly RowState[] = ['unchanged', 'new', 'modified', 'deleted'];
const DIRTY_ROW_STATES: readonly DirtyRowState[] = ['new', 'modified', 'deleted'];

export class Rows<T extends CustomTableTypes> {
  public CustomTable: CustomTable<T>;
  public array: Array<Row<T>> = [];
  private rowFilter: ((cells: T) => boolean) | null = null;

  constructor(table: CustomTable<T>, rows: T[]) {
    this.array = rows.map(row => new Row(table, row, 'unchanged'));
    this.CustomTable = table;
  }

  /** Neue Zeile hinzufügen (State: 'new') */
  add(value: T, state: RowState = 'new'): void {
    this.array.push(new Row(this.CustomTable, value, state));
    this.CustomTable.drawRows();
    this.CustomTable._notifyChange();
  }

  /**
   * Zeilen laden mit vollständiger State-Restauration aus Meta-Feldern:
   * - __errorMessage → 'error' (inkl. _errorState und _errorMessage)
   * - __localState (explizit 'unchanged'|'new'|'modified'|'deleted') → direkt übernommen
   * - kein __localState (Alt-Daten vor diesem Marker-Schema) → Fallback: kein _id → 'new', sonst 'unchanged'
   */
  load(array: T[], add = false): void {
    if (!add) this.array.length = 0;
    let hasPendingChanges = false;
    array.forEach(row => {
      const r = row as Record<string, unknown>;
      const storedLocalState = r.__localState as string | undefined;
      const storedErrorMsg = r.__errorMessage as string | undefined;
      const storedErrorState = r.__errorState as string | undefined;

      // Alle __-Felder generisch aus Cells entfernen (erweiterbar für zukünftige Meta-Felder)
      const cells = stripMetaFields({ ...row }) as T;
      const hasId =
        '_id' in (cells as Record<string, unknown>) && typeof (cells as Record<string, unknown>)._id === 'string';

      const baseState: RowState = NON_ERROR_ROW_STATES.includes(storedLocalState as RowState)
        ? (storedLocalState as RowState)
        : hasId
          ? 'unchanged'
          : 'new'; // Fallback für Alt-Daten ohne __localState-Marker
      const newRow = new Row(this.CustomTable, cells, baseState);

      if (storedErrorMsg) {
        newRow._state = 'error';
        newRow._errorState = DIRTY_ROW_STATES.includes(storedErrorState as DirtyRowState)
          ? (storedErrorState as DirtyRowState)
          : hasId
            ? 'modified'
            : 'new';
        newRow._errorMessage = storedErrorMsg;
      } else if (baseState === 'new' || baseState === 'modified') {
        hasPendingChanges = true;
      }

      this.array.push(newRow);
    });
    this.CustomTable.drawRows();
    if (hasPendingChanges) this.CustomTable._notifyChange();
  }

  /** @deprecated Identisches Verhalten wie rows.load() seit Vereinheitlichung */
  loadSmart(array: T[]): void {
    this.load(array);
  }

  /** Setzt/entfernt einen unsichtbaren Zeilenfilter und zeichnet die Tabelle neu. */
  setFilter(filter: ((cells: T) => boolean) | null): void {
    this.rowFilter = filter;
    this.CustomTable.drawRows();
  }

  /** Liefert die aktuell sichtbaren Zeilen unter Berücksichtigung des aktiven Filters. */
  getFilteredRows(): Array<Row<T>> {
    if (!this.rowFilter) return this.array;
    return this.array.filter(row => this.rowFilter?.(row.cells) ?? true);
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
    let hasRemovedRows = false;
    let hasSoftDeletes = false;
    for (const row of this.array) {
      const effectiveState = getEffectiveRowState(row);
      if (effectiveState === 'new') {
        hasRemovedRows = true;
      } else if (effectiveState !== 'deleted') {
        row._state = 'deleted';
        row._errorState = undefined;
        row._errorMessage = null;
        hasSoftDeletes = true;
      }
    }
    if (hasRemovedRows) {
      this.array = this.array.filter(row => getEffectiveRowState(row) !== 'new');
    }
    this.CustomTable.drawRows();
    if (hasRemovedRows || hasSoftDeletes) {
      this.CustomTable._notifyChange();
    }
  }

  /**
   * Nach erfolgreichem manuellen Speichern (inkl. Löschungen): Alle States zurücksetzen.
   * - 'new' → 'unchanged' (mit _id aus Server-Response)
   * - 'modified' → 'unchanged'
   * - 'deleted' → entfernt aus Array
   *
   * @param createdIds - Mapping von Index → neue _id für erstellte Einträge
   * @param includedRows - Row-Snapshot aus `getChangeRows()` vor dem Request. Nur diese
   *   Zeilen werden committet/entfernt - alles was danach neu hinzugekommen ist, bleibt
   *   fuer den naechsten Save-Lauf unangetastet (AutoSave-Commit-Race, siehe oben).
   */
  commitChanges(
    createdIds?: Map<number, string>,
    failedRows: ReadonlySet<Row<T>> = new Set<Row<T>>(),
    includedRows?: ReadonlySet<Row<T>>,
  ): void {
    this._commitCreateAndUpdate(createdIds, failedRows, includedRows);

    // Gelöschte Zeilen entfernen - nur wenn Teil dieses Batches
    this.array = this.array.filter(row => {
      if (getEffectiveRowState(row) !== 'deleted') return true;
      if (failedRows.has(row)) return true;
      return includedRows !== undefined && !includedRows.has(row);
    });
    this.CustomTable.drawRows();
  }

  /**
   * Nach erfolgreichem Auto-Save (OHNE Löschungen): Nur new/modified zurücksetzen.
   * Gelöschte Zeilen bleiben als 'deleted' sichtbar.
   *
   * @param createdIds - Mapping von Index → neue _id für erstellte Einträge
   * @param includedRows - siehe `commitChanges()`
   */
  commitAutoSave(
    createdIds?: Map<number, string>,
    failedRows: ReadonlySet<Row<T>> = new Set<Row<T>>(),
    includedRows?: ReadonlySet<Row<T>>,
  ): void {
    this._commitCreateAndUpdate(createdIds, failedRows, includedRows);
    this.CustomTable.drawRows();
  }

  /** Interne Hilfsmethode: new → unchanged, modified → unchanged */
  private _commitCreateAndUpdate(
    createdIds?: Map<number, string>,
    failedRows: ReadonlySet<Row<T>> = new Set<Row<T>>(),
    includedRows?: ReadonlySet<Row<T>>,
  ): void {
    let createIdx = 0;

    for (const row of this.array) {
      const effectiveState = getEffectiveRowState(row);
      const inBatch = includedRows === undefined || includedRows.has(row);

      switch (effectiveState) {
        case 'new': {
          // Zeile nicht Teil dieser Anfrage (erst waehrend des Requests angelegt) - createIdx
          // NICHT erhoehen, sonst verschiebt sich die Zuordnung fuer alle folgenden Zeilen.
          if (!inBatch) break;
          const isFailedRow = failedRows.has(row);
          const newId = createdIds?.get(createIdx);
          if (!isFailedRow && newId) {
            row._id = newId;
            (row.cells as Record<string, unknown>)._id = newId;
          }
          if (!isFailedRow) {
            row._state = 'unchanged';
            row._errorState = undefined;
            row._errorMessage = null;
            row._clientRequestId = undefined;
            row._originalCells = { ...row.cells };
          }
          createIdx++;
          break;
        }
        case 'modified':
          if (!inBatch) break;
          if (!failedRows.has(row)) {
            row._state = 'unchanged';
            row._errorState = undefined;
            row._errorMessage = null;
            row._originalCells = { ...row.cells };
          }
          break;
        case 'deleted':
          if (!inBatch) break;
          if (!failedRows.has(row)) {
            row._errorState = undefined;
            row._errorMessage = null;
          }
          break;
      }
    }
  }
}
