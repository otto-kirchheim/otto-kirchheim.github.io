import type { IVorgabenUaZ, IVorgabenUvorgabenB } from '@/types';
import { mergePerWeekdaySchicht, resolveSchichtDay } from '@/types';
import { B_WECHSEL_ZEIT } from './constants';

type SchichtenOverrides = IVorgabenUvorgabenB['schichtenOverrides'];

/** Frühschicht-Kante (beginn|ende) für einen Wochentag; undefined wenn arbeitsfrei/nicht vorhanden. */
const fruehKante = (
  az: IVorgabenUaZ | undefined,
  ov: SchichtenOverrides,
  weekday: number,
  kante: 'beginn' | 'ende',
): string | undefined =>
  az?.frueh ? resolveSchichtDay(mergePerWeekdaySchicht(az.frueh, ov?.frueh), weekday)?.[kante] : undefined;

/**
 * BZ-Von für den Anfangstag: Bereitschaft beginnt, wenn die Tagschicht endet.
 * Bei aktiver Spätschicht (und Arbeitstag) gilt spaet.Ende, sonst frueh.Ende, sonst 08:00.
 */
export function resolveBzVon(
  az: IVorgabenUaZ | undefined,
  ov: SchichtenOverrides,
  weekday: number,
  spaetActive: boolean,
): string {
  if (spaetActive && az?.spaet?.aktiv) {
    const spaet = resolveSchichtDay(mergePerWeekdaySchicht(az.spaet, ov?.spaet), weekday);
    if (spaet) return spaet.ende;
  }
  return fruehKante(az, ov, weekday, 'ende') ?? B_WECHSEL_ZEIT;
}

/**
 * BZ-Bis für den Endtag: Bereitschaft endet, wenn die Frühschicht wieder beginnt.
 * frueh.Beginn, sonst 08:00. (Spätschicht verschiebt das Ende nicht.)
 */
export function resolveBzBis(az: IVorgabenUaZ | undefined, ov: SchichtenOverrides, weekday: number): string {
  return fruehKante(az, ov, weekday, 'beginn') ?? B_WECHSEL_ZEIT;
}
