import type { IDatenEWT, IEwtQueryOptions, IMonatsDaten } from '@/types';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import { default as normalizeResourceRows } from '@/infrastructure/data/normalizeResourceRows';
import { default as Storage } from '@/infrastructure/storage/Storage';

export default function getEwtDaten(
  data?: IMonatsDaten['EWT'],
  Monat?: number,
  options?: IEwtQueryOptions,
): IMonatsDaten['EWT'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataE', { default: [] });
  const rows = normalizeResourceRows<IDatenEWT>(sourceData);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? getStoredMonatJahr().monat;
  const filter = options?.filter ?? 'beide';
  return activeMonat ? rows.filter(item => isEwtInMonat(item, activeMonat, filter)) : [];
}
