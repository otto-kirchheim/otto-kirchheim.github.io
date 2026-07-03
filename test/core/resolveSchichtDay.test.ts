import { describe, expect, it } from 'bun:test';
import {
  groupBySchedule,
  isOvernightSchicht,
  mergePerWeekdaySchicht,
  resolveSchichtDay,
} from '@/core/types/resolveSchichtDay';
import type { IPerWeekdaySchicht, SchichtBase } from '@/core/types/IVorgabenU';

const defaultSchicht: SchichtBase = { beginn: '06:00', ende: '14:00', pause: 30 };

function buildSchicht(overrides: Partial<IPerWeekdaySchicht> = {}): IPerWeekdaySchicht {
  return {
    aktiv: true,
    default: defaultSchicht,
    ...overrides,
  };
}

describe('resolveSchichtDay', () => {
  it('should return null for a weekday not in regelarbeitstage', () => {
    const schicht = buildSchicht({ regelarbeitstage: [1, 2, 3, 4, 5] });

    expect(resolveSchichtDay(schicht, 6)).toBeNull();
    expect(resolveSchichtDay(schicht, 7)).toBeNull();
  });

  it('should fall back to the default Mon-Fri regelarbeitstage when none are configured', () => {
    const schicht = buildSchicht();

    expect(resolveSchichtDay(schicht, 1)).toEqual(defaultSchicht);
    expect(resolveSchichtDay(schicht, 6)).toBeNull();
  });

  it('should fall back to the default Mon-Fri regelarbeitstage when the array is empty', () => {
    const schicht = buildSchicht({ regelarbeitstage: [] });

    expect(resolveSchichtDay(schicht, 3)).toEqual(defaultSchicht);
    expect(resolveSchichtDay(schicht, 7)).toBeNull();
  });

  it('should return the default SchichtBase when no override exists for the day', () => {
    const schicht = buildSchicht({ regelarbeitstage: [1, 2, 3, 4, 5] });

    expect(resolveSchichtDay(schicht, 2)).toEqual(defaultSchicht);
  });

  it('should merge an override for the given weekday into the default SchichtBase', () => {
    const schicht = buildSchicht({
      regelarbeitstage: [1, 2, 3, 4, 5],
      overrides: { 5: { ende: '12:00' } },
    });

    expect(resolveSchichtDay(schicht, 5)).toEqual({ beginn: '06:00', ende: '12:00', pause: 30 });
  });
});

describe('mergePerWeekdaySchicht', () => {
  it('should return the base unchanged when no override is provided', () => {
    const base = buildSchicht();

    expect(mergePerWeekdaySchicht(base)).toBe(base);
  });

  it('should field-merge default and overrides, letting the override win', () => {
    const base = buildSchicht({
      regelarbeitstage: [1, 2, 3, 4, 5],
      overrides: { 1: { pause: 15 } },
    });

    const merged = mergePerWeekdaySchicht(base, {
      default: { ende: '15:00' } as Partial<SchichtBase> as SchichtBase,
      overrides: { 2: { beginn: '07:00' } },
    });

    expect(merged.default).toEqual({ beginn: '06:00', ende: '15:00', pause: 30 });
    expect(merged.overrides).toEqual({ 1: { pause: 15 }, 2: { beginn: '07:00' } });
    expect(merged.regelarbeitstage).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('isOvernightSchicht', () => {
  it('should return false when ende is after beginn', () => {
    expect(isOvernightSchicht({ beginn: '06:00', ende: '14:00', pause: 30 })).toBe(false);
  });

  it('should return true when ende is before beginn (Mitternachtsdurchgang)', () => {
    expect(isOvernightSchicht({ beginn: '22:00', ende: '06:00', pause: 30 })).toBe(true);
  });
});

describe('groupBySchedule', () => {
  it('should group all 7 weekdays into a workdays-group and an arbeitsfrei-group by default', () => {
    const schicht = buildSchicht({ regelarbeitstage: [1, 2, 3, 4, 5] });

    const groups = groupBySchedule(schicht);

    expect(groups).toEqual([
      { days: [1, 2, 3, 4, 5], config: defaultSchicht },
      { days: [6, 7], config: null },
    ]);
  });

  it('should keep a day with a differing override in its own group', () => {
    const schicht = buildSchicht({
      regelarbeitstage: [1, 2, 3],
      overrides: { 2: { ende: '10:00' } },
    });

    const groups = groupBySchedule(schicht);

    expect(groups).toEqual([
      { days: [1, 3], config: defaultSchicht },
      { days: [2], config: { beginn: '06:00', ende: '10:00', pause: 30 } },
      { days: [4, 5, 6, 7], config: null },
    ]);
  });

  it('should return groups sorted by the first weekday in each group', () => {
    const schicht = buildSchicht({ regelarbeitstage: [3, 5] });

    const groups = groupBySchedule(schicht);

    expect(groups[0]?.days[0]).toBeLessThan(groups[1]?.days[0] ?? Infinity);
  });
});
