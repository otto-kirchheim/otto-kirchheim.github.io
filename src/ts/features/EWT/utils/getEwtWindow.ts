import type { IDatenEWT } from '@/types';
import dayjs from '@/infrastructure/date/configDayjs';

export default function getEwtWindow(entry: IDatenEWT): { start: dayjs.Dayjs; end: dayjs.Dayjs } | null {
  if (!entry.beginE || !entry.endeE) return null;

  const baseDate = dayjs(entry.tagE);
  if (!baseDate.isValid()) return null;

  const start = dayjs(`${baseDate.format('YYYY-MM-DD')}T${entry.beginE}`);
  let end = dayjs(`${baseDate.format('YYYY-MM-DD')}T${entry.endeE}`);

  // `tagE` speichert bereits den echten Starttag der Schicht.
  // Für Nachtschichten darf daher nur das Ende in den Folgetag rollen,
  // nicht der Start künstlich auf den Vortag verschoben werden.
  if (end.isSameOrBefore(start)) {
    end = end.add(1, 'day');
  }

  return { start, end };
}
