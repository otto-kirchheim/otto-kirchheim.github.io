import type { IDatenBZ } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';

/**
 * Zeitfenster eines Bereitschaftszeitraums aus `Beginn`/`Ende` (Ueberschneidungspruefung, spiegelt `ensureNoOverlap` im Backend).
 *
 * @param row - BZ-Zeile.
 * @returns Fenster in ms, `null` bei ungueltigem Datum.
 */
export default function getBzWindow(row: unknown): { start: number; end: number } | null {
  const bz = row as IDatenBZ;
  const start = dayjs(String(bz.Beginn));
  const end = dayjs(String(bz.Ende));
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.valueOf(), end: end.valueOf() };
}
