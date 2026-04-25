import type { IDatenBE, IDataQueryOptions, IMonatsDaten } from '../../../core/types';
import { filterByMonat, getMonatFromBE } from '../../../infrastructure/date/getMonatFromItem';
import { getStoredMonatJahr } from '../../../infrastructure/date/dateStorage';
import { default as normalizeResourceRows } from '../../../infrastructure/data/normalizeResourceRows';
import { default as Storage } from '../../../infrastructure/storage/Storage';

export default function getBereitschaftsEinsatzDaten(
  data?: IMonatsDaten['BE'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BE'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataBE', { default: [] });
  const rows = normalizeResourceRows<IDatenBE>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? getStoredMonatJahr().monat;
  return activeMonat ? filterByMonat(rows, activeMonat, getMonatFromBE) : [];
}
