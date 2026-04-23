import type { IDatenBZ, IDataQueryOptions, IMonatsDaten } from '../../../interfaces';
import { filterByMonat, getMonatFromBZ } from '../../../infrastructure/date/getMonatFromItem';
import { getStoredMonatJahr } from '../../../infrastructure/date/dateStorage';
import { default as normalizeResourceRows } from '../../../infrastructure/data/normalizeResourceRows';
import { default as Storage } from '../../../infrastructure/storage/Storage';

export default function getBereitschaftsZeitraumDaten(
  data?: IMonatsDaten['BZ'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BZ'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataBZ', { default: [] });
  const rows = normalizeResourceRows<IDatenBZ>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? getStoredMonatJahr().monat;
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromBZ) : [];
}
