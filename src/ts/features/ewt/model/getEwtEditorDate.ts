import type { IDatenEWT } from '@/types';
import { default as checkMaxTag } from '@/shared/lib/validation/checkMaxTag';
import dayjs from '@/shared/lib/date/configDayjs';

/**
 * Datum für den EWT-Editor: der Tag der Zeile, sonst (neue Zeile) der heutige Tag im Monat, falls er dort existiert
 * (`checkMaxTag`), andernfalls der 1.
 *
 * @param row - Zeile mit `Tag` (`YYYY-MM-DD`) oder `null`/`undefined` bei neuer Zeile.
 * @param jahr - Jahr.
 * @param monat - Monat, 0-basiert (dayjs).
 * @returns Datum für den Editor.
 */
export default function getEwtEditorDate(
  row: Pick<IDatenEWT, 'Tag'> | null | undefined,
  jahr: number,
  monat: number,
): dayjs.Dayjs {
  const rowDate = row?.Tag ? dayjs(row.Tag) : null;
  if (rowDate?.isValid()) return rowDate;

  return dayjs([jahr, monat, checkMaxTag(jahr, monat)]);
}
