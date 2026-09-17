/**
 * Reiner Reducer-Kern für `CustomTable` (Phase A des `useReducer`-Umbaus). Jede Aktion
 * entspricht 1:1 einer heutigen `Row`/`Rows`-Methode (siehe Kommentare je Case) -- nur die
 * Implementierung wandert von einer in-place mutierenden Klassenmethode in eine reine
 * `(state, action) => state`-Funktion, die immer ein NEUES State-Objekt zurückgibt.
 *
 * Bewusste Abweichung von strikter Reducer-Reinheit: `createRowRecord()` vergibt per `uuidv4()`
 * ein `uid` für neu erzeugte Zeilen. Das ist dieselbe pragmatische Praxis wie in Redux Toolkit
 * (`nanoid()` in Reducern) -- ein `uid` ist reiner interner Cache-Schlüssel, den nichts jemals
 * über zwei Aufrufe hinweg vergleicht; ein verworfener Wert aus Reacts StrictMode-Doppelaufruf
 * hat keine beobachtbare Auswirkung.
 *
 * `drawRows()`/`_notifyChange()`-Seiteneffekte sind hier bewusst NICHT enthalten -- die
 * gehören der Shim-Schicht (`Row.ts`/`Rows.ts`), die anhand des Rückgabewerts entscheidet,
 * ob/wann sie ausgelöst werden.
 */
import { v4 as uuidv4 } from 'uuid';
import { stripMetaFields } from '../data/metaFields';
import { getEffectiveRowState, getRowKey } from './customTableTypes';
import type {
  CustomTableTypes,
  DirtyRowState,
  RowRecord,
  RowState,
  TableAction,
  TableReducerState,
} from './customTableTypes';

const NON_ERROR_ROW_STATES: readonly RowState[] = ['unchanged', 'new', 'modified', 'deleted'];
const DIRTY_ROW_STATES: readonly DirtyRowState[] = ['new', 'modified', 'deleted'];

/**
 * Spiegelt `Row.ts`s Konstruktor. Exportiert, weil `CustomTable.ts`s Konstruktor denselben
 * Aufbau für den initialen Reducer-State braucht (kein `LOAD` -- das restauriert zusätzlich
 * Meta-Felder aus `__localState`/`__errorMessage`, was die alte `Rows`-Konstruktor-Zeile
 * `rows.map(row => new Row(table, row, 'unchanged'))` nie tat).
 */
export function createRowRecord<T extends CustomTableTypes>(cells: T, state: RowState = 'unchanged'): RowRecord<T> {
  const record: RowRecord<T> = {
    uid: uuidv4(),
    cells,
    _state: state,
    _errorMessage: null,
  };
  const raw = cells as Record<string, unknown>;
  if (typeof raw._id === 'string') record._id = raw._id;
  if (typeof raw.clientRequestId === 'string') record._clientRequestId = raw.clientRequestId;
  if (state === 'new' && !record._clientRequestId) record._clientRequestId = uuidv4();
  if (state === 'unchanged') record._originalCells = { ...cells };
  return record;
}

/** Spiegelt `Rows.ts`s private `_commitCreateAndUpdate()`. */
function commitCreateAndUpdate<T extends CustomTableTypes>(
  rows: RowRecord<T>[],
  createdIds: Map<number, string> | undefined,
  failedRowKeys: ReadonlySet<string>,
  includedRowKeys: ReadonlySet<string> | undefined,
): RowRecord<T>[] {
  let createIdx = 0;
  return rows.map(row => {
    const effectiveState = getEffectiveRowState(row);
    const inBatch = includedRowKeys === undefined || includedRowKeys.has(getRowKey(row));

    switch (effectiveState) {
      case 'new': {
        if (!inBatch) return row;
        const isFailedRow = failedRowKeys.has(getRowKey(row));
        const newId = createdIds?.get(createIdx);
        createIdx++;
        if (isFailedRow) return row;
        const cells = newId ? ({ ...row.cells, _id: newId } as T) : row.cells;
        return {
          ...row,
          _id: newId ?? row._id,
          cells,
          _state: 'unchanged' as RowState,
          _errorState: undefined,
          _errorMessage: null,
          _clientRequestId: undefined,
          _originalCells: { ...cells },
        };
      }
      case 'modified':
        if (!inBatch || failedRowKeys.has(getRowKey(row))) return row;
        return {
          ...row,
          _state: 'unchanged' as RowState,
          _errorState: undefined,
          _errorMessage: null,
          _originalCells: { ...row.cells },
        };
      case 'deleted':
        if (!inBatch || failedRowKeys.has(getRowKey(row))) return row;
        return { ...row, _errorState: undefined, _errorMessage: null };
      default:
        return row;
    }
  });
}

export function tableReducer<T extends CustomTableTypes>(
  state: TableReducerState<T>,
  action: TableAction<T>,
): TableReducerState<T> {
  switch (action.type) {
    case 'ADD': {
      const newRow = createRowRecord(action.value, action.state ?? 'new');
      return { ...state, rows: [...state.rows, newRow] };
    }

    case 'LOAD': {
      const loadedRows = action.rows.map(row => {
        const r = row as Record<string, unknown>;
        const storedLocalState = r.__localState as string | undefined;
        const storedErrorMsg = r.__errorMessage as string | undefined;
        const storedErrorState = r.__errorState as string | undefined;
        const cells = stripMetaFields({ ...row }) as T;
        const hasId =
          '_id' in (cells as Record<string, unknown>) && typeof (cells as Record<string, unknown>)._id === 'string';

        const baseState: RowState = NON_ERROR_ROW_STATES.includes(storedLocalState as RowState)
          ? (storedLocalState as RowState)
          : hasId
            ? 'unchanged'
            : 'new';
        const record = createRowRecord(cells, baseState);

        if (storedErrorMsg) {
          record._state = 'error';
          record._errorState = DIRTY_ROW_STATES.includes(storedErrorState as DirtyRowState)
            ? (storedErrorState as DirtyRowState)
            : hasId
              ? 'modified'
              : 'new';
          record._errorMessage = storedErrorMsg;
        }
        return record;
      });
      return { ...state, rows: action.add ? [...state.rows, ...loadedRows] : loadedRows };
    }

    case 'SET_FILTER':
      return { ...state, rowFilter: action.filter };

    case 'UPDATE_CELLS':
      return {
        ...state,
        rows: state.rows.map(row => {
          if (row.uid !== action.uid) return row;
          const raw = action.value as Record<string, unknown>;
          const nextId = typeof raw._id === 'string' ? raw._id : row._id;

          if (row._state === 'error') {
            return {
              ...row,
              cells: action.value,
              _id: nextId,
              _state: row._errorState === 'new' ? ('new' as RowState) : ('modified' as RowState),
              _errorState: undefined,
              _errorMessage: null,
            };
          }
          if (row._state === 'unchanged') {
            return { ...row, cells: action.value, _id: nextId, _state: 'modified' as RowState };
          }
          // 'new' bleibt 'new', 'deleted'/'modified' bleiben unveraendert (siehe Row.ts).
          return { ...row, cells: action.value, _id: nextId };
        }),
      };

    case 'DELETE_ROW': {
      const target = state.rows.find(row => row.uid === action.uid);
      if (!target) return state;
      const effectiveState = getEffectiveRowState(target);
      if (effectiveState === 'new') {
        return { ...state, rows: state.rows.filter(row => row.uid !== action.uid) };
      }
      return {
        ...state,
        rows: state.rows.map(row =>
          row.uid === action.uid
            ? {
                ...row,
                _stateBeforeDelete: effectiveState,
                _state: 'deleted' as RowState,
                _errorState: undefined,
                _errorMessage: null,
              }
            : row,
        ),
      };
    }

    case 'UNDO_DELETE':
      return {
        ...state,
        rows: state.rows.map(row => {
          if (row.uid !== action.uid || getEffectiveRowState(row) !== 'deleted') return row;
          return {
            ...row,
            _state: row._stateBeforeDelete ?? ('unchanged' as RowState),
            _stateBeforeDelete: undefined,
            _errorState: undefined,
            _errorMessage: null,
          };
        }),
      };

    case 'SET_ROW_FIELD':
      return {
        ...state,
        rows: state.rows.map(row => (row.uid === action.uid ? { ...row, [action.field]: action.value } : row)),
      };

    case 'DELETE_ALL':
      return {
        ...state,
        rows: state.rows
          .filter(row => getEffectiveRowState(row) !== 'new')
          .map(row =>
            getEffectiveRowState(row) === 'deleted'
              ? row
              : { ...row, _state: 'deleted' as RowState, _errorState: undefined, _errorMessage: null },
          ),
      };

    case 'COMMIT_CHANGES': {
      const rows = commitCreateAndUpdate(state.rows, action.createdIds, action.failedRowKeys, action.includedRowKeys);
      const filtered = rows.filter(row => {
        if (getEffectiveRowState(row) !== 'deleted') return true;
        if (action.failedRowKeys.has(getRowKey(row))) return true;
        return action.includedRowKeys !== undefined && !action.includedRowKeys.has(getRowKey(row));
      });
      return { ...state, rows: filtered };
    }

    case 'COMMIT_AUTO_SAVE':
      return {
        ...state,
        rows: commitCreateAndUpdate(state.rows, action.createdIds, action.failedRowKeys, action.includedRowKeys),
      };

    case 'SYNC_CELLS_SILENTLY':
      return {
        ...state,
        rows: state.rows.map(row => {
          if (row._state === 'deleted') return row;
          const next = action.transform(row);
          if (next === null) return row;
          return row._state === 'unchanged'
            ? { ...row, cells: next, _originalCells: { ...next } }
            : { ...row, cells: next };
        }),
      };

    case 'PATCH_CELLS_AS_MODIFIED':
      return {
        ...state,
        rows: state.rows.map(row => {
          if (row._state === 'deleted') return row;
          const next = action.transform(row);
          if (next === null) return row;
          return row._state === 'unchanged'
            ? { ...row, cells: next, _state: 'modified' as RowState }
            : { ...row, cells: next };
        }),
      };

    case 'MARK_DIRTY_BY_MATCH':
      return {
        ...state,
        rows: state.rows.map(row => {
          if (row._state === 'deleted') return row;
          if (!action.matcher(row.cells)) return row;
          return {
            ...row,
            _state: (typeof row._id === 'string' && row._id.length > 0 ? 'modified' : 'new') as RowState,
          };
        }),
      };

    case 'RECONCILE_DELETED': {
      const serverIds = new Set(
        action.serverRows
          .filter(row => typeof (row as Record<string, unknown>)._id === 'string')
          .map(row => (row as Record<string, unknown>)._id as string),
      );

      const markedDeleted = state.rows.map(row => {
        if (row._state === 'deleted') return row;
        if (typeof row._id !== 'string') return row;
        if (!action.matcher(row.cells)) return row;
        if (serverIds.has(row._id)) return row;
        return { ...row, _state: 'deleted' as RowState };
      });

      const existingIds = new Set(
        markedDeleted.filter(row => typeof row._id === 'string').map(row => row._id as string),
      );
      const appended: RowRecord<T>[] = [];
      for (const serverRow of action.serverRows) {
        const id = (serverRow as Record<string, unknown>)._id;
        if (typeof id !== 'string' || existingIds.has(id) || !action.matcher(serverRow)) continue;
        appended.push(createRowRecord(serverRow, 'deleted'));
      }
      return { ...state, rows: [...markedDeleted, ...appended] };
    }

    case 'TOGGLE_COLUMN_SORT':
      return {
        ...state,
        columns: state.columns.map(column => {
          if (column.name !== action.columnName) return { ...column, sorted: false, direction: null };
          const direction = column.direction === 'ASC' ? 'DESC' : 'ASC';
          return { ...column, sorted: true, direction };
        }),
      };

    default:
      return state;
  }
}
