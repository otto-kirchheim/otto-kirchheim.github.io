import { describe, expect, it, vi } from 'bun:test';
import { createCustomTable } from '@/shared/ui/custom-table/CustomTable';

type Zeile = { _id?: string; label: string };

function tabelle(rows: Record<string, unknown>[], onChange = vi.fn()) {
  document.body.innerHTML = '<table id="start-table"></table>';
  const table = createCustomTable<Zeile>('start-table', {
    columns: [{ name: 'label', title: 'Label' }],
    rows: rows as Zeile[],
    onChange,
  });
  return { table, onChange };
}

describe('CustomTable: Startzeilen behalten ihren gespeicherten Zustand', () => {
  it('übernimmt __localState/__errorMessage aus dem Storage statt alles als unchanged anzulegen', () => {
    const { table } = tabelle([
      { _id: 'a', label: 'gespeichert', __localState: 'unchanged' },
      { label: 'ungesendet', __localState: 'new' },
      { _id: 'c', label: 'geaendert', __localState: 'modified' },
      { _id: 'd', label: 'geloescht', __localState: 'deleted' },
      { label: 'fehler', __errorMessage: 'Server 500', __errorState: 'new' },
    ]);

    expect(table.rows.array.map(row => row._state)).toEqual(['unchanged', 'new', 'modified', 'deleted', 'error']);
    expect(table.rows.array[4]._errorState).toBe('new');
    expect(table.rows.array[4]._errorMessage).toBe('Server 500');

    const changes = table.rows.getChanges(true);
    expect(changes.create.map(row => row.label)).toEqual(['ungesendet', 'fehler']);
    expect(changes.update.map(row => row.label)).toEqual(['geaendert']);
    expect(changes.delete).toEqual(['d']);
  });

  it('entfernt die Meta-Felder aus den Zellen', () => {
    const { table } = tabelle([{ label: 'ungesendet', __localState: 'new' }]);

    expect(table.rows.array[0].cells).toEqual({ label: 'ungesendet' });
  });

  it('legt Zeilen ohne Meta-Felder weiterhin als unchanged an (Tabellen ohne Storage-Bezug)', () => {
    const { table, onChange } = tabelle([{ label: 'ohne-id' }, { _id: 'x', label: 'mit-id' }]);

    expect(table.rows.array.map(row => row._state)).toEqual(['unchanged', 'unchanged']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('meldet offene Änderungen aus dem Storage an onChange (AutoSave-Anstoß)', () => {
    const { onChange } = tabelle([
      { _id: 'a', label: 'gespeichert', __localState: 'unchanged' },
      { label: 'ungesendet', __localState: 'new' },
    ]);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
