import type { IDatenEWT } from '@/types';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';

export default function getEwtEditorDate(
  row: Pick<IDatenEWT, 'tagE'> | null | undefined,
  jahr: number,
  monat: number,
): dayjs.Dayjs {
  const rowDate = row?.tagE ? dayjs(row.tagE) : null;
  if (rowDate?.isValid()) return rowDate;

  return dayjs([jahr, monat, checkMaxTag(jahr, monat)]);
}
