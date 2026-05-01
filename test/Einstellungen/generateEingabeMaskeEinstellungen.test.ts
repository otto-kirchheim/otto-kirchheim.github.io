import { describe, expect, it, vi } from 'bun:test';

vi.mock('@/features/Einstellungen/utils', () => ({
  generateEingabeTabelleEinstellungenVorgabenB: vi.fn(),
  saveTableDataVorgabenU: vi.fn(),
  setMonatJahr: vi.fn(),
}));

vi.mock('@/features/Bereitschaft', () => ({
  BereitschaftsEinsatzZeiträume: {},
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: vi.fn(), set: vi.fn(), check: vi.fn() },
}));

import {
  formatDelayLabel,
  msToSliderPosition,
  sliderPositionToMs,
} from '@/features/Einstellungen/utils/generateEingabeMaskeEinstellungen';

// ─── formatDelayLabel ────────────────────────────────────────────────────────

describe('formatDelayLabel', () => {
  it('zeigt ms unter 1000ms', () => {
    expect(formatDelayLabel(0)).toBe('0 ms');
    expect(formatDelayLabel(500)).toBe('500 ms');
    expect(formatDelayLabel(999)).toBe('999 ms');
  });

  it('zeigt Sekunden zwischen 1000 und 59999ms', () => {
    expect(formatDelayLabel(1000)).toBe('1 s');
    expect(formatDelayLabel(5000)).toBe('5 s');
    expect(formatDelayLabel(59999)).toBe('60 s');
  });

  it('zeigt Minuten ab 60000ms', () => {
    expect(formatDelayLabel(60000)).toBe('1 min');
    expect(formatDelayLabel(120000)).toBe('2 min');
    expect(formatDelayLabel(300000)).toBe('5 min');
  });
});

// ─── sliderPositionToMs ──────────────────────────────────────────────────────

describe('sliderPositionToMs', () => {
  it('Position 0 → 1s', () => expect(sliderPositionToMs(0)).toBe(1000));
  it('Position 9 → 10s', () => expect(sliderPositionToMs(9)).toBe(10000));
  it('Position 10 → 15s (5s-Bereich Start)', () => expect(sliderPositionToMs(10)).toBe(15000));
  it('Position 14 → 35s', () => expect(sliderPositionToMs(14)).toBe(35000));
  it('Position 19 → 60s (5s-Bereich Ende)', () => expect(sliderPositionToMs(19)).toBe(60000));
  it('Position 20 → 60s (1min-Bereich Start)', () => expect(sliderPositionToMs(20)).toBe(60000));
  it('Position 21 → 120s', () => expect(sliderPositionToMs(21)).toBe(120000));
  it('Position 24 → 300s (Maximum)', () => expect(sliderPositionToMs(24)).toBe(300000));

  it('klemmt negative Position auf 0', () => expect(sliderPositionToMs(-5)).toBe(1000));
  it('klemmt Position > 24 auf 24', () => expect(sliderPositionToMs(99)).toBe(300000));
});

// ─── msToSliderPosition ──────────────────────────────────────────────────────

describe('msToSliderPosition', () => {
  it('1000ms → Position 0', () => expect(msToSliderPosition(1000)).toBe(0));
  it('5000ms → Position 4', () => expect(msToSliderPosition(5000)).toBe(4));
  it('10000ms → Position 9', () => expect(msToSliderPosition(10000)).toBe(9));
  it('15000ms → Position 10', () => expect(msToSliderPosition(15000)).toBe(10));
  it('35000ms → Position 14', () => expect(msToSliderPosition(35000)).toBe(14));
  it('60000ms im 15-60s-Bereich → Position 19', () => expect(msToSliderPosition(60000)).toBe(19));
  it('120000ms → Position 21', () => expect(msToSliderPosition(120000)).toBe(21));
  it('300000ms → Position 24', () => expect(msToSliderPosition(300000)).toBe(24));
});

// ─── Roundtrip ───────────────────────────────────────────────────────────────

describe('sliderPositionToMs / msToSliderPosition Roundtrip', () => {
  it.each([0, 5, 9, 10, 15, 19, 22, 24] as const)('Position %i bleibt nach Roundtrip gleich', (pos: number) => {
    const ms = sliderPositionToMs(pos);
    expect(msToSliderPosition(ms)).toBe(pos);
  });
});
