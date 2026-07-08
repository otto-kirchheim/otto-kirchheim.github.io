import { describe, expect, it } from 'bun:test';
import { err, ok, unwrapEnvelope } from '@/core/types/api';

describe('core/types/api', () => {
  describe('ok', () => {
    it('wraps a value in an { ok: true } result', () => {
      expect(ok(42)).toEqual({ ok: true, data: 42 });
    });
  });

  describe('err', () => {
    it('wraps an error in an { ok: false } result', () => {
      expect(err('failed')).toEqual({ ok: false, error: 'failed' });
    });
  });

  describe('unwrapEnvelope', () => {
    it('returns data when success is true', () => {
      expect(unwrapEnvelope({ success: true, data: { id: 1 }, statusCode: 200 })).toEqual({ id: 1 });
    });

    it('throws with the envelope message when statusCode >= 400', () => {
      expect(() => unwrapEnvelope({ success: false, message: 'Nicht gefunden', statusCode: 404 })).toThrow(
        'Nicht gefunden',
      );
    });

    it('throws a default message when statusCode >= 400 without a message', () => {
      expect(() => unwrapEnvelope({ success: false, statusCode: 500 })).toThrow('API-Fehler (500)');
    });

    it('returns data when success is false but statusCode is below 400', () => {
      expect(unwrapEnvelope({ success: false, data: 'trotzdem da', statusCode: 200 })).toBe('trotzdem da');
    });
  });
});
