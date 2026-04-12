import dayjs from '../../utilities/configDayjs';
import type { IDatenBZ, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromBZ, normalizeResourceRows, Storage } from '../../utilities';

export default function getBereitschaftsZeitraumDaten(
  data?: IMonatsDaten['BZ'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BZ'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataBZ', { default: [] });
  const rows = normalizeResourceRows<IDatenBZ>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromBZ) : [];
}
