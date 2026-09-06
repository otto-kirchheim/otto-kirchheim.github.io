import { beforeEach, describe, expect, it, vi } from 'bun:test';
import {
  escapeHtml,
  markErrorRows,
  markFetchErrorRows,
  showErrorDialog,
} from '@/infrastructure/autoSave/errorHandling';
import type { CustomTable, CustomTableTypes, Row } from '@/infrastructure/table/CustomTable';
import type { BulkErrorEntry } from '@/infrastructure/api/apiService';
import type { RowErrorMatch } from '@/infrastructure/autoSave/savePipeline';

describe('errorHandling', () => {
  describe('escapeHtml', () => {
    it('escapes ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes less-than', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    it('escapes multiple special characters', () => {
      expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    });

    it('returns unchanged string without special chars', () => {
      expect(escapeHtml('hello world 123')).toBe('hello world 123');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('markErrorRows', () => {
    it('returns empty array when no errors', () => {
      const table = { drawRows: vi.fn() } as unknown as CustomTable<CustomTableTypes>;
      const result = markErrorRows(table, [], []);
      expect(result).toEqual([]);
      expect(table.drawRows).not.toHaveBeenCalled();
    });

    it('marks rows with error state and message', () => {
      const row: Record<string, unknown> = { _state: 'new', _errorState: undefined, _errorMessage: undefined };
      const error: BulkErrorEntry = { operation: 'create', message: 'Duplicate entry' };
      const matches: RowErrorMatch[] = [{ row: row as any, error, sourceState: 'new' }];
      const table = { drawRows: vi.fn() } as unknown as CustomTable<CustomTableTypes>;

      const result = markErrorRows(table, matches, [error]);
      expect(row._state).toBe('error');
      expect(row._errorState).toBe('new');
      expect(row._errorMessage).toBe('Duplicate entry');
      expect(table.drawRows).toHaveBeenCalledTimes(1);
      expect(result).toEqual([error]);
    });

    it('handles multiple error rows', () => {
      const row1: Record<string, unknown> = { _state: 'new', _errorState: undefined, _errorMessage: undefined };
      const row2: Record<string, unknown> = { _state: 'modified', _errorState: undefined, _errorMessage: undefined };
      const error1: BulkErrorEntry = { operation: 'create', message: 'Error 1' };
      const error2: BulkErrorEntry = { operation: 'update', message: 'Error 2', id: 'abc' };
      const matches: RowErrorMatch[] = [
        { row: row1 as any, error: error1, sourceState: 'new' },
        { row: row2 as any, error: error2, sourceState: 'modified' },
      ];
      const table = { drawRows: vi.fn() } as unknown as CustomTable<CustomTableTypes>;

      markErrorRows(table, matches, [error1, error2]);
      expect(row1._state).toBe('error');
      expect(row2._state).toBe('error');
      expect(row2._errorState).toBe('modified');
    });
  });

  describe('showErrorDialog', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      vi.clearAllMocks();
    });

    it('creates modal in DOM with correct content', () => {
      showErrorDialog('BZ', [{ operation: 'create', message: 'Failed to create', clientRequestId: 'crid-1' }]);

      const modal = document.querySelector('[data-error-dialog]');
      expect(modal).toBeTruthy();
      expect(modal?.innerHTML).toContain('Fehler beim Speichern');
      expect(modal?.innerHTML).toContain('Failed to create');
      expect(modal?.closest('dialog')?.hasAttribute('open')).toBe(true);

      modal?.closest('dialog')?.remove();
    });

    it('extends existing visible dialog instead of creating a new one', () => {
      showErrorDialog('BZ', [{ operation: 'create', message: 'Erster Fehler', clientRequestId: 'crid-1' }]);

      const modal = document.querySelector<HTMLElement>('[data-error-dialog]');
      expect(modal).toBeTruthy();

      showErrorDialog('BE', [{ operation: 'update', message: 'Zweiter Fehler', id: 'abc' }]);

      expect(document.querySelectorAll('[data-error-dialog]').length).toBe(1);
      expect(modal?.innerHTML).toContain('Erster Fehler');
      expect(modal?.innerHTML).toContain('Zweiter Fehler');
      expect(modal?.querySelector('[data-error-count]')?.textContent).toContain('2 Fehler');

      modal?.closest('dialog')?.remove();
    });

    it('blurs the focused element and disposes the modal on dismiss', () => {
      showErrorDialog('BZ', [{ operation: 'create', message: 'Fehler', clientRequestId: 'crid-1' }]);
      const modal = document.querySelector<HTMLElement>('[data-error-dialog]')!;

      const focusable = document.createElement('button');
      modal.appendChild(focusable);
      focusable.focus();
      const blurSpy = vi.spyOn(focusable, 'blur');

      modal.querySelector<HTMLButtonElement>('.dialog-fuss [data-bs-dismiss="modal"]')!.click();

      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-error-dialog]')).toBeNull();
    });
  });

  describe('markFetchErrorRows', () => {
    function makeRow(overrides: Record<string, unknown>): Record<string, unknown> {
      return { _state: 'unchanged', _errorState: undefined, _errorMessage: undefined, _id: undefined, ...overrides };
    }

    it('marks new, modified and deleted rows affected by the failed request', () => {
      const newRow = makeRow({ _state: 'new' });
      const modifiedRow = makeRow({ _state: 'modified', _id: 'mod-1' });
      const deletedRow = makeRow({ _state: 'deleted', _id: 'del-1' });
      const untouchedModified = makeRow({ _state: 'modified', _id: 'mod-untouched' });
      const drawRows = vi.fn();
      const table = {
        rows: { array: [newRow, modifiedRow, deletedRow, untouchedModified] },
        drawRows,
      } as unknown as CustomTable<CustomTableTypes>;
      const changeRows = {
        create: [newRow] as unknown as Row<CustomTableTypes>[],
        update: [modifiedRow] as unknown as Row<CustomTableTypes>[],
        delete: [deletedRow] as unknown as Row<CustomTableTypes>[],
      };

      markFetchErrorRows(table, changeRows, 'Netzwerkfehler');

      expect(newRow._state).toBe('error');
      expect(newRow._errorState).toBe('new');
      expect(modifiedRow._state).toBe('error');
      expect(modifiedRow._errorState).toBe('modified');
      expect(deletedRow._state).toBe('error');
      expect(deletedRow._errorState).toBe('deleted');
      expect(untouchedModified._state).toBe('modified');
      expect(drawRows).toHaveBeenCalledTimes(1);
    });

    it('does not redraw when no row matches the failed request', () => {
      const drawRows = vi.fn();
      const table = {
        rows: { array: [makeRow({ _state: 'unchanged' })] },
        drawRows,
      } as unknown as CustomTable<CustomTableTypes>;
      const changeRows = { create: [], update: [], delete: [] };

      markFetchErrorRows(table, changeRows, 'Netzwerkfehler');

      expect(drawRows).not.toHaveBeenCalled();
    });
  });
});
