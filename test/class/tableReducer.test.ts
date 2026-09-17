import { describe, expect, it } from 'bun:test';
import { tableReducer } from '@/infrastructure/table/tableReducer';
import { getRowKey } from '@/infrastructure/table/CustomTable';
import type { CustomTableTypes, RowRecord, TableReducerState } from '@/infrastructure/table/customTableTypes';

interface TableRow extends CustomTableTypes {
  _id?: string;
  label: string;
  value?: number;
}

function emptyState(): TableReducerState<TableRow> {
  return { rows: [], columns: [], rowFilter: null, editingEnabled: null, sortingEnabled: null };
}

function findRow(state: TableReducerState<TableRow>, label: string): RowRecord<TableRow> | undefined {
  return state.rows.find(row => row.cells.label === label);
}

describe('tableReducer', () => {
  it('ADD legt eine neue Zeile mit eigener uid und _clientRequestId an', () => {
    const state = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' } });
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]._state).toBe('new');
    expect(state.rows[0].uid).toBeTruthy();
    expect(state.rows[0]._clientRequestId).toBeTruthy();
  });

  it('ADD mit explizitem state respektiert diesen', () => {
    const state = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' }, state: 'unchanged' });
    expect(state.rows[0]._state).toBe('unchanged');
    // 'unchanged' -> _originalCells gesetzt, kein _clientRequestId erzwungen.
    expect(state.rows[0]._originalCells).toEqual({ label: 'A' });
  });

  it('LOAD restauriert State aus Meta-Feldern (__localState/__errorMessage)', () => {
    const state = tableReducer(emptyState(), {
      type: 'LOAD',
      rows: [
        { label: 'unchanged-row', _id: 'a' },
        { label: 'new-row' },
        { label: 'modified-row', _id: 'b', __localState: 'modified' } as unknown as TableRow,
        { label: 'error-row', _id: 'c', __errorMessage: 'kaputt', __errorState: 'modified' } as unknown as TableRow,
      ],
    });

    expect(findRow(state, 'unchanged-row')?._state).toBe('unchanged');
    expect(findRow(state, 'new-row')?._state).toBe('new');
    expect(findRow(state, 'modified-row')?._state).toBe('modified');
    const errorRow = findRow(state, 'error-row');
    expect(errorRow?._state).toBe('error');
    expect(errorRow?._errorState).toBe('modified');
    expect(errorRow?._errorMessage).toBe('kaputt');
    // Meta-Felder duerfen nicht in den Zellen landen.
    expect(errorRow?.cells).not.toHaveProperty('__errorMessage');
  });

  it('LOAD mit add=true haengt an, statt zu ersetzen', () => {
    const first = tableReducer(emptyState(), { type: 'LOAD', rows: [{ label: 'A' }] });
    const second = tableReducer(first, { type: 'LOAD', rows: [{ label: 'B' }], add: true });
    expect(second.rows.map(r => r.cells.label)).toEqual(['A', 'B']);
  });

  it('UPDATE_CELLS setzt unchanged -> modified, laesst new unveraendert', () => {
    const withNew = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' } });
    const uidNew = withNew.rows[0].uid;
    const afterNewEdit = tableReducer(withNew, { type: 'UPDATE_CELLS', uid: uidNew, value: { label: 'A2' } });
    expect(afterNewEdit.rows[0]._state).toBe('new');
    expect(afterNewEdit.rows[0].cells.label).toBe('A2');

    const withUnchanged = tableReducer(emptyState(), {
      type: 'ADD',
      value: { label: 'B', _id: 'b' },
      state: 'unchanged',
    });
    const uidUnchanged = withUnchanged.rows[0].uid;
    const afterEdit = tableReducer(withUnchanged, {
      type: 'UPDATE_CELLS',
      uid: uidUnchanged,
      value: { label: 'B2', _id: 'b' },
    });
    expect(afterEdit.rows[0]._state).toBe('modified');
  });

  it('DELETE_ROW entfernt new-Zeilen direkt, soft-deleted alles andere', () => {
    const withNew = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' } });
    const afterDeleteNew = tableReducer(withNew, { type: 'DELETE_ROW', uid: withNew.rows[0].uid });
    expect(afterDeleteNew.rows).toHaveLength(0);

    const withExisting = tableReducer(emptyState(), {
      type: 'ADD',
      value: { label: 'B', _id: 'b' },
      state: 'unchanged',
    });
    const afterSoftDelete = tableReducer(withExisting, { type: 'DELETE_ROW', uid: withExisting.rows[0].uid });
    expect(afterSoftDelete.rows).toHaveLength(1);
    expect(afterSoftDelete.rows[0]._state).toBe('deleted');
    expect(afterSoftDelete.rows[0]._stateBeforeDelete).toBe('unchanged');
  });

  it('UNDO_DELETE stellt den vorherigen State wieder her', () => {
    const withExisting = tableReducer(emptyState(), {
      type: 'ADD',
      value: { label: 'B', _id: 'b' },
      state: 'unchanged',
    });
    const deleted = tableReducer(withExisting, { type: 'DELETE_ROW', uid: withExisting.rows[0].uid });
    const undone = tableReducer(deleted, { type: 'UNDO_DELETE', uid: deleted.rows[0].uid });
    expect(undone.rows[0]._state).toBe('unchanged');
    expect(undone.rows[0]._stateBeforeDelete).toBeUndefined();
  });

  it('DELETE_ALL entfernt new-Zeilen und markiert den Rest als deleted', () => {
    const loaded = tableReducer(emptyState(), {
      type: 'LOAD',
      rows: [{ label: 'existing', _id: 'a' }],
    });
    const withNew = tableReducer(loaded, { type: 'ADD', value: { label: 'brandnew' } });
    const afterDeleteAll = tableReducer(withNew, { type: 'DELETE_ALL' });
    expect(afterDeleteAll.rows).toHaveLength(1);
    expect(afterDeleteAll.rows[0].cells.label).toBe('existing');
    expect(afterDeleteAll.rows[0]._state).toBe('deleted');
  });

  it('COMMIT_AUTO_SAVE setzt new/modified auf unchanged, respektiert includedRowKeys (Commit-Race)', () => {
    const withNew = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' } });
    const includedRowKeys = new Set(withNew.rows.map(getRowKey));

    // Waehrend des "Requests" kommt eine zweite Zeile dazu -- nicht im Snapshot.
    const withSecondNew = tableReducer(withNew, { type: 'ADD', value: { label: 'B' } });

    const createdIds = new Map<number, string>([[0, 'server-id-1']]);
    const committed = tableReducer(withSecondNew, {
      type: 'COMMIT_AUTO_SAVE',
      createdIds,
      failedRowKeys: new Set(),
      includedRowKeys,
    });

    const [rowA, rowB] = committed.rows;
    expect(rowA._state).toBe('unchanged');
    expect(rowA._id).toBe('server-id-1');
    expect(rowA._clientRequestId).toBeUndefined();
    // Nicht im Snapshot enthaltene Zeile bleibt unangetastet.
    expect(rowB._state).toBe('new');
    expect(rowB._id).toBeUndefined();
  });

  it('COMMIT_CHANGES entfernt erfolgreich geloeschte Zeilen aus dem Snapshot, laesst neue Loeschungen unangetastet', () => {
    const loaded = tableReducer(emptyState(), {
      type: 'LOAD',
      rows: [
        { label: 'a', _id: 'a' },
        { label: 'b', _id: 'b' },
      ],
    });
    const deletedA = tableReducer(loaded, { type: 'DELETE_ROW', uid: findRow(loaded, 'a')!.uid });
    const includedRowKeys = new Set([getRowKey(findRow(deletedA, 'a')!)]);

    // Waehrend des Requests wird auch b geloescht -- nicht im Snapshot.
    const deletedBoth = tableReducer(deletedA, { type: 'DELETE_ROW', uid: findRow(deletedA, 'b')!.uid });

    const committed = tableReducer(deletedBoth, {
      type: 'COMMIT_CHANGES',
      createdIds: new Map(),
      failedRowKeys: new Set(),
      includedRowKeys,
    });

    expect(committed.rows).toHaveLength(1);
    expect(committed.rows[0].cells.label).toBe('b');
    expect(committed.rows[0]._state).toBe('deleted');
  });

  it('SYNC_CELLS_SILENTLY aktualisiert Zellen ohne den State zu aendern', () => {
    const loaded = tableReducer(emptyState(), { type: 'LOAD', rows: [{ label: 'a', _id: 'a', value: 1 }] });
    const synced = tableReducer(loaded, {
      type: 'SYNC_CELLS_SILENTLY',
      transform: row => (row._id === 'a' ? { ...row.cells, value: 99 } : null),
    });
    expect(synced.rows[0].cells.value).toBe(99);
    expect(synced.rows[0]._state).toBe('unchanged');
    expect(synced.rows[0]._originalCells?.value).toBe(99);
  });

  it('PATCH_CELLS_AS_MODIFIED markiert eine unchanged-Zeile als modified', () => {
    const loaded = tableReducer(emptyState(), { type: 'LOAD', rows: [{ label: 'a', _id: 'a', value: 1 }] });
    const patched = tableReducer(loaded, {
      type: 'PATCH_CELLS_AS_MODIFIED',
      transform: row => (row._id === 'a' ? { ...row.cells, value: 42 } : null),
    });
    expect(patched.rows[0].cells.value).toBe(42);
    expect(patched.rows[0]._state).toBe('modified');
  });

  it('MARK_DIRTY_BY_MATCH markiert passende Zeilen als modified/new, ueberspringt deleted', () => {
    const loaded = tableReducer(emptyState(), {
      type: 'LOAD',
      rows: [
        { label: 'match', _id: 'a' },
        { label: 'no-match', _id: 'b' },
      ],
    });
    const deleted = tableReducer(loaded, { type: 'DELETE_ROW', uid: findRow(loaded, 'match')!.uid });
    const marked = tableReducer(deleted, { type: 'MARK_DIRTY_BY_MATCH', matcher: () => true });
    // 'match' ist bereits deleted -> bleibt deleted (uebersprungen).
    expect(findRow(marked, 'match')?._state).toBe('deleted');
    expect(findRow(marked, 'no-match')?._state).toBe('modified');
  });

  it('RECONCILE_DELETED markiert fehlende lokale Zeilen als deleted und haengt Server-Extras an', () => {
    const loaded = tableReducer(emptyState(), {
      type: 'LOAD',
      rows: [
        { label: 'both', _id: 'both' },
        { label: 'local-only', _id: 'local-only' },
      ],
    });
    const reconciled = tableReducer(loaded, {
      type: 'RECONCILE_DELETED',
      serverRows: [
        { label: 'both', _id: 'both' },
        { label: 'server-only', _id: 'server-only' },
      ],
      matcher: () => true,
    });

    expect(findRow(reconciled, 'both')?._state).toBe('unchanged');
    expect(findRow(reconciled, 'local-only')?._state).toBe('deleted');
    const serverOnly = findRow(reconciled, 'server-only');
    expect(serverOnly?._state).toBe('deleted');
    expect(serverOnly?.uid).toBeTruthy();
  });

  it('TOGGLE_COLUMN_SORT setzt genau eine Spalte auf sortiert, alle anderen zurueck', () => {
    const state: TableReducerState<TableRow> = {
      ...emptyState(),
      columns: [
        {
          name: 'a',
          title: 'A',
          longTitle: 'A',
          breakpoints: null,
          sortable: true,
          sorted: true,
          direction: 'ASC',
          type: 'text',
          parser: v => String(v),
          classes: [],
          visible: true,
          html: false,
        },
        {
          name: 'b',
          title: 'B',
          longTitle: 'B',
          breakpoints: null,
          sortable: true,
          sorted: false,
          direction: null,
          type: 'text',
          parser: v => String(v),
          classes: [],
          visible: true,
          html: false,
        },
      ],
    };
    const toggled = tableReducer(state, { type: 'TOGGLE_COLUMN_SORT', columnName: 'b' });
    expect(toggled.columns.find(c => c.name === 'a')).toMatchObject({ sorted: false, direction: null });
    expect(toggled.columns.find(c => c.name === 'b')).toMatchObject({ sorted: true, direction: 'ASC' });
  });

  it('Zustandsobjekte werden nicht mutiert (Immutabilitaet)', () => {
    const before = tableReducer(emptyState(), { type: 'ADD', value: { label: 'A' } });
    const beforeSnapshot = JSON.parse(JSON.stringify(before));
    tableReducer(before, { type: 'UPDATE_CELLS', uid: before.rows[0].uid, value: { label: 'A2' } });
    expect(before).toEqual(beforeSnapshot);
  });
});
