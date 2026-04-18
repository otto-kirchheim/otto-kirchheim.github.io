import type { IDatenEWT, IEwtQueryOptions, IMonatsDaten } from '../../../interfaces';
import { getStoredMonatJahr, isEwtInMonat, normalizeResourceRows, Storage } from '../../../utilities';

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
