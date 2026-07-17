import { describe, expect, it } from 'bun:test';
import { normalizeTimeString } from '@/infrastructure/validation/timeString';

describe('normalizeTimeString', () => {
  it('lässt gültige HH:mm-Werte unverändert', () => {
    expect(normalizeTimeString('00:30')).toBe('00:30');
    expect(normalizeTimeString('23:59')).toBe('23:59');
  });

  it('hebt einstellige Stunden auf HH:mm', () => {
    expect(normalizeTimeString('0:30')).toBe('00:30');
    expect(normalizeTimeString('7:05')).toBe('07:05');
  });

  it('verwirft Sekundenanteile', () => {
    expect(normalizeTimeString('08:15:00')).toBe('08:15');
  });

  it('trimmt Whitespace', () => {
    expect(normalizeTimeString(' 0:30 ')).toBe('00:30');
  });

  it('gibt bei ungültigen Werten einen leeren String zurück', () => {
    expect(normalizeTimeString('')).toBe('');
    expect(normalizeTimeString('abc')).toBe('');
    expect(normalizeTimeString('24:00')).toBe('');
    expect(normalizeTimeString('12:60')).toBe('');
    expect(normalizeTimeString('30')).toBe('');
    expect(normalizeTimeString('12:3')).toBe('');
  });
});
