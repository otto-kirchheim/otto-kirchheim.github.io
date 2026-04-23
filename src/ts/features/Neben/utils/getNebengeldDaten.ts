import type { IDatenN, IDataQueryOptions, IMonatsDaten } from '../../../interfaces';
import { filterByMonat, getMonatFromN } from '../../../infrastructure/date/getMonatFromItem';
import { getStoredMonatJahr } from '../../../infrastructure/date/dateStorage';
import { default as normalizeResourceRows } from '../../../infrastructure/data/normalizeResourceRows';
import Storage from '../../../infrastructure/storage/Storage';
export default function getNebengeldDaten(
  data?: IMonatsDaten['N'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['N'] {
  if (!Storage.check('Benutzer')) return [];

  const { monat: storedMonat, jahr } = getStoredMonatJahr();
  if (jahr < 2024) return [];

  const sourceData = data ?? Storage.get<unknown>('dataN', { default: [] });
  const rows = normalizeResourceRows<IDatenN>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? storedMonat;
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromN) : [];
}
