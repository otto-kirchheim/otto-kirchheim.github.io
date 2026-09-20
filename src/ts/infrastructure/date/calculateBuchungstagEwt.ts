import type { IDatenEWT } from '@/types';
import type { Dayjs } from 'dayjs';
import dayjs from './configDayjs';

/**
 * Parst eine Uhrzeit `HH:mm` (strikt) und legt sie auf den Tag von `baseDate`.
 *
 * @param baseDate - Tag, auf den die Uhrzeit gesetzt wird.
 * @param value - Uhrzeit als `HH:mm`.
 * @returns Zeitpunkt mit Sekunden/Millisekunden 0; `null` bei fehlendem oder ungültigem Wert.
 */
function parseTime(baseDate: Dayjs, value?: string): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value, 'HH:mm', true);
  if (!parsed.isValid()) return null;
  return baseDate.hour(parsed.hour()).minute(parsed.minute()).second(0).millisecond(0);
}

/**
 * Ermittelt den Buchungstag eines EWT-Eintrags: der Tag, auf den der größere Teil der Zeitspanne
 * fällt. Endet die Zeit nicht nach dem Beginn, gilt sie als über Mitternacht hinaus; bei Gleichstand
 * der beiden Teile zählt der Starttag.
 *
 * @param row - EWT-Zeile mit `Tag`, `beginE` und `endeE` (`HH:mm`).
 * @returns Buchungstag als `YYYY-MM-DD`; bei fehlender Zeit der Starttag, bei ungültigem `Tag` dessen Rohwert.
 */
export default function calculateBuchungstagEwt(row: IDatenEWT): string {
  const tag = dayjs(row.Tag);
  if (!tag.isValid()) return row.Tag;

  const start = parseTime(tag.startOf('day'), row.beginE as string | undefined);
  const endRaw = parseTime(tag.startOf('day'), row.endeE as string | undefined);
  if (!start || !endRaw) return tag.format('YYYY-MM-DD');

  let end = endRaw;
  if (end.isSameOrBefore(start)) {
    end = end.add(1, 'day');
  }

  const midnight = start.startOf('day').add(1, 'day');
  const firstPartMinutes = Math.max(0, Math.min(midnight.diff(start, 'minute'), end.diff(start, 'minute')));
  const secondPartMinutes = Math.max(0, end.diff(midnight, 'minute'));

  if (secondPartMinutes > firstPartMinutes) {
    return end.startOf('day').format('YYYY-MM-DD');
  }

  return start.startOf('day').format('YYYY-MM-DD');
}
