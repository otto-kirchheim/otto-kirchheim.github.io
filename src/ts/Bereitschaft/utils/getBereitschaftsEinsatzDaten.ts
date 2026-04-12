import dayjs from '../../utilities/configDayjs';
import type { IDatenBE, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromBE, normalizeResourceRows, Storage } from '../../utilities';

export default function getBereitschaftsEinsatzDaten(
  data?: IMonatsDaten['BE'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BE'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataBE', { default: [] });
  const rows = normalizeResourceRows<IDatenBE>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromBE) : [];
}
