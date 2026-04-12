import type { IDatenN, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromN, normalizeResourceRows, Storage } from '../../utilities';
import dayjs from '../../utilities/configDayjs';

export default function getNebengeldDaten(
  data?: IMonatsDaten['N'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['N'] {
  if (!Storage.check('Benutzer')) return [];

  const jahr = Storage.get<number>('Jahr', { default: dayjs().year() });
  if (jahr < 2024) return [];

  const sourceData = data ?? Storage.get<unknown>('dataN', { default: [] });
  const rows = normalizeResourceRows<IDatenN>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromN) : [];
}
