import { describe, expect, it, vi } from 'bun:test';
import { escapeHtml, markErrorRows, showErrorDialog } from '../../src/ts/infrastructure/autoSave/errorHandling';
import type { CustomTable, CustomTableTypes } from '../../src/ts/class/CustomTable';
import type { BulkErrorEntry } from '../../src/ts/infrastructure/api/apiService';
import type { RowErrorMatch } from '../../src/ts/infrastructure/autoSave/savePipeline';

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
    it('creates modal in DOM when bootstrap is available', () => {
      const mockShow = vi.fn();
      (window as any).bootstrap = {
        Modal: class {
          show = mockShow;
        },
      };

      showErrorDialog('BZ', [{ operation: 'create', message: 'Failed to create', clientRequestId: 'crid-1' }]);

      const modal = document.querySelector('.modal');
      expect(modal).toBeTruthy();
      expect(modal?.innerHTML).toContain('Fehler beim Speichern');
      expect(modal?.innerHTML).toContain('Failed to create');
      expect(mockShow).toHaveBeenCalled();

      // Cleanup
      modal?.remove();
      delete (window as any).bootstrap;
    });

    it('removes modal when bootstrap is not available', () => {
      delete (window as any).bootstrap;

      showErrorDialog('BE', [{ operation: 'update', message: 'Server error', id: '123' }]);

      const modal = document.querySelector('.modal');
      expect(modal).toBeFalsy();
    });
  });
});
