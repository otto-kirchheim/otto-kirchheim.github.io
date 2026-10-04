import { LreType } from '@otto-kirchheim/nebengeld-shared';
import { B_WECHSEL_MINUTE, B_WECHSEL_STUNDE, getBereitschaftsEinsatzDaten } from '.';
import isSameBereitschaftsEinsatz from './isSameBereitschaftsEinsatz';
import type { IDatenBE } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';

// ─── Geteilte Validatoren ────────────────────────────────────────────────────

/**
 * Prüft, ob der Einsatz einen bestehenden überschneidet. Liegt das Ende eines vorhandenen Einsatzes nicht nach dessen Beginn, gilt es als am Folgetag.
 *
 * @param einsatzStart - Beginn des neuen Einsatzes.
 * @param einsatzEnd - Ende des neuen Einsatzes.
 * @param exclude - Einsatz, der beim Vergleich ignoriert wird (beim Bearbeiten).
 * @returns `true`, wenn sich der Zeitraum mit einem vorhandenen, nicht gelöschten Einsatz überschneidet.
 */
export function hasOverlap(
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
  exclude?: IDatenBE,
): boolean {
  return getBereitschaftsEinsatzDaten(undefined, undefined, { excludeDeleted: true }).some(be => {
    if (exclude && isSameBereitschaftsEinsatz(be, exclude)) return false;
    const beDate = dayjs(be.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const existingStart = dayjs(`${beDate}T${be.Beginn}`);
    const existingEndRaw = dayjs(`${beDate}T${be.Ende}`);
    const existingEnd = existingEndRaw.isAfter(existingStart) ? existingEndRaw : existingEndRaw.add(1, 'day');
    return einsatzStart.isBefore(existingEnd) && existingStart.isBefore(einsatzEnd);
  });
}

/**
 * Prüft den Mindestabstand von 10 Minuten zu einem vorherigen LRE-1/2-Einsatz im selben Bereitschaftstag (Fenster ab 08:00).
 *
 * @param einsatzStart - Beginn des neuen Einsatzes.
 * @param exclude - Einsatz, der beim Vergleich ignoriert wird (beim Bearbeiten).
 * @returns `true`, wenn ein LRE-1/2-Einsatz im laufenden 08:00-Fenster weniger als 10 Minuten vor `einsatzStart` endet.
 */
export function hasLre12TooClose(einsatzStart: ReturnType<typeof dayjs>, exclude?: IDatenBE): boolean {
  const cutoff = einsatzStart.startOf('day').hour(B_WECHSEL_STUNDE).minute(B_WECHSEL_MINUTE).second(0).millisecond(0);
  const windowStart = einsatzStart.isBefore(cutoff) ? cutoff.subtract(1, 'day') : cutoff;
  return getBereitschaftsEinsatzDaten(undefined, undefined, { excludeDeleted: true }).some(be => {
    if (be.LRE !== LreType.LRE_1 && be.LRE !== LreType.LRE_2) return false;
    if (exclude && isSameBereitschaftsEinsatz(be, exclude)) return false;
    const beDate = dayjs(be.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const beStartRaw = dayjs(`${beDate}T${be.Beginn}`);
    if (beStartRaw.isBefore(windowStart)) return false;
    const beEndRaw = dayjs(`${beDate}T${be.Ende}`);
    const beEnd = beEndRaw.isAfter(beStartRaw) ? beEndRaw : beEndRaw.add(1, 'day');
    const gap = einsatzStart.diff(beEnd, 'minute');
    return gap >= 0 && gap < 10;
  });
}

/**
 * Prüft, ob im selben Bereitschaftstag (08:00 bis 08:00) schon ein LRE-1-Einsatz existiert.
 *
 * @param einsatzStart - Beginn des neuen Einsatzes.
 * @param Tag - Datum des Einsatzes im Format `YYYY-MM-DD` (Wert des Datumsfelds).
 * @param exclude - Einsatz, der beim Vergleich ignoriert wird (beim Bearbeiten).
 * @returns `true`, wenn im 08:00-bis-08:00-Fenster um den Einsatz bereits ein LRE 1 beginnt.
 */
export function hasConflictingLre1(einsatzStart: ReturnType<typeof dayjs>, Tag: string, exclude?: IDatenBE): boolean {
  const cutoff = dayjs(Tag)
    .set('hour', B_WECHSEL_STUNDE)
    .set('minute', B_WECHSEL_MINUTE)
    .set('second', 0)
    .set('millisecond', 0);
  const windowStart = einsatzStart.isBefore(cutoff)
    ? cutoff.subtract(1, 'day').set('hour', B_WECHSEL_STUNDE).set('minute', B_WECHSEL_MINUTE)
    : cutoff;
  const windowEnd = windowStart.add(1, 'day').set('hour', B_WECHSEL_STUNDE).set('minute', B_WECHSEL_MINUTE);
  return getBereitschaftsEinsatzDaten(undefined, undefined, { excludeDeleted: true }).some(be => {
    if (be.LRE !== LreType.LRE_1) return false;
    if (exclude && isSameBereitschaftsEinsatz(be, exclude)) return false;
    const beDate = dayjs(be.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const beStart = dayjs(`${beDate}T${be.Beginn}`);
    return beStart.isSameOrAfter(windowStart) && beStart.isBefore(windowEnd);
  });
}
