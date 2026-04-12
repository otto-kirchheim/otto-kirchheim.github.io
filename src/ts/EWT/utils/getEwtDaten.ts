import dayjs from '../../utilities/configDayjs';
import type { IDatenEWT, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { isEwtInMonat, normalizeResourceRows, Storage } from '../../utilities';

export default function getEwtDaten(
  data?: IMonatsDaten['EWT'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['EWT'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataE', { default: [] });
  const rows = normalizeResourceRows<IDatenEWT>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  return activeMonat ? rows.filter(item => isEwtInMonat(item, activeMonat)) : [];
}
