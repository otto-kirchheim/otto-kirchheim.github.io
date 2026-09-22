import type { IDatenEWT } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';

/**
 * Bestimmt das Zeitfenster der Arbeitszeit (`beginE`–`endeE`) eines EWT-Eintrags für Überschneidungsprüfungen.
 *
 * @param entry - EWT-Eintrag.
 * @returns Start und Ende (Ende ggf. am Folgetag); null, wenn Beginn/Ende fehlen oder der Tag ungültig ist.
 */
export default function getEwtWindow(entry: IDatenEWT): { start: dayjs.Dayjs; end: dayjs.Dayjs } | null {
  if (!entry.beginE || !entry.endeE) return null;

  const baseDate = dayjs(entry.Tag);
  if (!baseDate.isValid()) return null;

  const start = dayjs(`${baseDate.format('YYYY-MM-DD')}T${entry.beginE}`);
  let end = dayjs(`${baseDate.format('YYYY-MM-DD')}T${entry.endeE}`);

  // `Tag` speichert bereits den echten Starttag der Schicht.
  // Für Nachtschichten darf daher nur das Ende in den Folgetag rollen,
  // nicht der Start künstlich auf den Vortag verschoben werden.
  if (end.isSameOrBefore(start)) {
    end = end.add(1, 'day');
  }

  return { start, end };
}
