import { describe, expect, it } from 'bun:test';
import {
  stableSerialize,
  rowSignature,
  mapCreatedIdsByClientRequestId,
  mapCreatedIdsByContent,
} from '../../src/ts/infrastructure/autoSave/changeTracking';
import type { CustomTable, CustomTableTypes } from '../../src/ts/class/CustomTable';

describe('changeTracking', () => {
  describe('stableSerialize', () => {
    it('serializes null', () => {
      expect(stableSerialize(null)).toBe('null');
    });

    it('serializes undefined', () => {
      expect(stableSerialize(undefined)).toBe(undefined as unknown as string);
    });

    it('serializes primitives', () => {
      expect(stableSerialize(42)).toBe('42');
      expect(stableSerialize('hello')).toBe('"hello"');
      expect(stableSerialize(true)).toBe('true');
    });

    it('serializes arrays', () => {
      expect(stableSerialize([1, 2, 3])).toBe('[1,2,3]');
    });

    it('serializes objects with sorted keys', () => {
      expect(stableSerialize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    });

    it('serializes nested objects with sorted keys', () => {
      const obj = { z: { b: 2, a: 1 }, a: [3, 1] };
      expect(stableSerialize(obj)).toBe('{"a":[3,1],"z":{"a":1,"b":2}}');
    });

    it('is deterministic regardless of key insertion order', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { z: 3, x: 1, y: 2 };
      expect(stableSerialize(a)).toBe(stableSerialize(b));
    });

    it('handles empty objects and arrays', () => {
      expect(stableSerialize({})).toBe('{}');
      expect(stableSerialize([])).toBe('[]');
    });
  });

  describe('rowSignature', () => {
    it('omits _id, updatedAt, createdAt, __v', () => {
      const row = { _id: '123', updatedAt: 'x', createdAt: 'y', __v: 0, beginB: 'a', endeB: 'b', pauseB: 0 };
      const sig = rowSignature('BZ', row as unknown as CustomTableTypes);
      expect(sig).not.toContain('_id');
      expect(sig).not.toContain('updatedAt');
      expect(sig).not.toContain('createdAt');
      expect(sig).not.toContain('__v');
      expect(sig).toContain('beginB');
    });

    it('omits bereitschaftszeitraumBE for BE resource', () => {
      const row = { beginBE: '10:00', endeBE: '12:00', bereitschaftszeitraumBE: '456' };
      const sig = rowSignature('BE', row as unknown as CustomTableTypes);
      expect(sig).not.toContain('bereitschaftszeitraumBE');
    });

    it('omits ewtRef for N resource', () => {
      const row = { tagN: '01.03.2026', ewtRef: 'ewt-123' };
      const sig = rowSignature('N', row as unknown as CustomTableTypes);
      expect(sig).not.toContain('ewtRef');
    });

    it('omits undefined values', () => {
      const row = { beginB: 'a', endeB: undefined, pauseB: 0 };
      const sig = rowSignature('BZ', row as unknown as CustomTableTypes);
      expect(sig).not.toContain('endeB');
    });

    it('produces same signature for same content regardless of key order', () => {
      const row1 = { beginB: 'a', pauseB: 0 };
      const row2 = { pauseB: 0, beginB: 'a' };
      expect(rowSignature('BZ', row1 as unknown as CustomTableTypes)).toBe(
        rowSignature('BZ', row2 as unknown as CustomTableTypes),
      );
    });
  });

  describe('mapCreatedIdsByClientRequestId', () => {
    function mockTable(rows: { _state: string; _clientRequestId?: string }[]): CustomTable<CustomTableTypes> {
      return {
        rows: {
          array: rows,
        },
      } as unknown as CustomTable<CustomTableTypes>;
    }

    it('returns empty map for empty references', () => {
      const table = mockTable([{ _state: 'new', _clientRequestId: 'crid-1' }]);
      const result = mapCreatedIdsByClientRequestId(table, []);
      expect(result.size).toBe(0);
    });

    it('maps pending rows by clientRequestId', () => {
      const table = mockTable([
        { _state: 'new', _clientRequestId: 'crid-1' },
        { _state: 'new', _clientRequestId: 'crid-2' },
        { _state: 'existing' },
      ]);
      const refs = [
        { _id: 'server-id-1', clientRequestId: 'crid-1' },
        { _id: 'server-id-2', clientRequestId: 'crid-2' },
      ];
      const result = mapCreatedIdsByClientRequestId(table, refs);
      expect(result.size).toBe(2);
      expect(result.get(0)).toBe('server-id-1');
      expect(result.get(1)).toBe('server-id-2');
    });

    it('skips rows without clientRequestId', () => {
      const table = mockTable([{ _state: 'new' }]);
      const refs = [{ _id: 'server-id-1', clientRequestId: 'crid-unknown' }];
      const result = mapCreatedIdsByClientRequestId(table, refs);
      expect(result.size).toBe(0);
    });
  });

  describe('mapCreatedIdsByContent', () => {
    function mockTable(rows: { _state: string; cells: Record<string, unknown> }[]): CustomTable<CustomTableTypes> {
      return {
        rows: {
          array: rows,
        },
      } as unknown as CustomTable<CustomTableTypes>;
    }

    it('returns empty map for empty docs', () => {
      const table = mockTable([{ _state: 'new', cells: { beginB: 'a', endeB: 'b', pauseB: 0 } }]);
      const result = mapCreatedIdsByContent('BZ', table, []);
      expect(result.size).toBe(0);
    });

    it('matches created docs to pending rows by content signature', () => {
      const table = mockTable([{ _state: 'new', cells: { beginB: 'a', endeB: 'b', pauseB: 0 } }]);
      // Server returns same content with _id added
      const createdDocs = [{ _id: 'new-id', beginB: 'a', endeB: 'b', pauseB: 0 }];
      const result = mapCreatedIdsByContent('BZ', table, createdDocs);
      expect(result.size).toBe(1);
      expect(result.get(0)).toBe('new-id');
    });

    it('falls back to positional matching for unmatched signatures', () => {
      const table = mockTable([{ _state: 'new', cells: { beginB: 'x', endeB: 'y', pauseB: 99 } }]);
      // Doc has different content — no signature match
      const createdDocs = [{ _id: 'fallback-id', beginB: 'a', endeB: 'b', pauseB: 0 }];
      const result = mapCreatedIdsByContent('BZ', table, createdDocs);
      expect(result.size).toBe(1);
      expect(result.get(0)).toBe('fallback-id');
    });
  });
});
