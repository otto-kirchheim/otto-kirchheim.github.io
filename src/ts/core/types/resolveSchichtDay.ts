import type { IPerWeekdaySchicht, SchichtBase } from './IVorgabenU.js';

const DEFAULT_REGELARBEITSTAGE: readonly number[] = [1, 2, 3, 4, 5];

/**
 * Löst den effektiven Schicht-Eintrag für einen Wochentag auf.
 * Gibt null zurück wenn der Tag arbeitsfrei ist (nicht in regelarbeitstage).
 */
export function resolveSchichtDay(schicht: IPerWeekdaySchicht, isoWeekday: number): SchichtBase | null {
  const regelarbeitstage = schicht.regelarbeitstage?.length ? schicht.regelarbeitstage : DEFAULT_REGELARBEITSTAGE;

  if (!regelarbeitstage.includes(isoWeekday)) return null;

  const override = schicht.overrides?.[isoWeekday as keyof NonNullable<IPerWeekdaySchicht['overrides']>];
  if (!override) return schicht.default;

  return { ...schicht.default, ...override };
}

/**
 * Merged eine globale Schicht mit den per-Variante hinterlegten (Teil-)Overrides.
 * `default` und `overrides` werden feldweise zusammengeführt, der Override gewinnt.
 */
export function mergePerWeekdaySchicht(
  base: IPerWeekdaySchicht,
  override?: Partial<IPerWeekdaySchicht>,
): IPerWeekdaySchicht {
  if (!override) return base;
  return {
    ...base,
    ...override,
    default: { ...base.default, ...(override.default ?? {}) },
    overrides: { ...(base.overrides ?? {}), ...(override.overrides ?? {}) },
  };
}

export type ScheduleGroup = {
  days: number[];
  config: SchichtBase | null; // null = arbeitsfrei
};

/**
 * Fasst Wochentage mit identischem resolved config in Gruppen zusammen.
 * Gibt alle 7 Tage (1–7) als Gruppen zurück, sortiert nach erstem Wochentag.
 */
export function groupBySchedule(schicht: IPerWeekdaySchicht): ScheduleGroup[] {
  const groups: ScheduleGroup[] = [];

  for (let day = 1; day <= 7; day++) {
    const config = resolveSchichtDay(schicht, day);
    const match = groups.find(g => configsEqual(g.config, config));

    if (match) {
      match.days.push(day);
    } else {
      groups.push({ days: [day], config });
    }
  }

  return groups.sort((a, b) => (a.days[0] ?? 0) - (b.days[0] ?? 0));
}

function configsEqual(a: SchichtBase | null, b: SchichtBase | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.beginn === b.beginn && a.ende === b.ende && a.pause === b.pause;
}

/** Erkennt ob eine Schicht über Mitternacht geht (ende < beginn als HH:mm-Vergleich). */
export function isOvernightSchicht(config: SchichtBase): boolean {
  return config.ende < config.beginn;
}
