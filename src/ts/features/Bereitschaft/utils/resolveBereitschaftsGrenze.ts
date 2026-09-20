import type { IVorgabenUaZ, IVorgabenUvorgabenB } from '@/types';
import { mergePerWeekdaySchicht, resolveSchichtDay } from '@/types';
import { B_WECHSEL_ZEIT } from './constants';

type SchichtenOverrides = IVorgabenUvorgabenB['schichtenOverrides'];

/**
 * Frühschicht-Kante für einen Wochentag.
 *
 * @param az - Arbeitszeit-Vorgabe.
 * @param ov - Schicht-Overrides der Bereitschafts-Vorgabe.
 * @param weekday - ISO-Wochentag (1 = Montag, 7 = Sonntag).
 * @param kante - `beginn` oder `ende` der Schicht.
 * @returns Uhrzeit "HH:mm"; `undefined`, wenn arbeitsfrei oder keine Frühschicht vorhanden.
 */
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
 *
 * @param az - Arbeitszeit-Vorgabe.
 * @param ov - Schicht-Overrides der Bereitschafts-Vorgabe.
 * @param weekday - ISO-Wochentag des Anfangstags (1 = Montag, 7 = Sonntag).
 * @param spaetActive - Spätschicht ist für diese Bereitschaft aktiviert.
 * @returns Uhrzeit "HH:mm".
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
 *
 * @param az - Arbeitszeit-Vorgabe.
 * @param ov - Schicht-Overrides der Bereitschafts-Vorgabe.
 * @param weekday - ISO-Wochentag des Endtags (1 = Montag, 7 = Sonntag).
 * @returns Uhrzeit "HH:mm".
 */
export function resolveBzBis(az: IVorgabenUaZ | undefined, ov: SchichtenOverrides, weekday: number): string {
  return fruehKante(az, ov, weekday, 'beginn') ?? B_WECHSEL_ZEIT;
}
