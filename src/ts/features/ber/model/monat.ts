import type { Dayjs } from 'dayjs';
import type { IDatenBE, IDatenBZ } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';

/**
 * Monat eines Bereitschaftszeitraums (`Beginn`).
 *
 * @param item - Bereitschaftszeitraum.
 * @returns Monat (1-12).
 */
export function getMonatFromBZ(item: IDatenBZ): number {
  return dayjs(item.Beginn as string | Dayjs).month() + 1;
}

/**
 * Monat eines Bereitschaftseinsatzes (`Tag` im Format `DD.MM.YYYY`).
 *
 * @param item - Bereitschaftseinsatz.
 * @returns Monat (1-12).
 */
export function getMonatFromBE(item: IDatenBE): number {
  return dayjs(item.Tag, 'DD.MM.YYYY').month() + 1;
}
