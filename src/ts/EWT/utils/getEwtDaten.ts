import type { IDatenEWT, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { isEwtInMonat, normalizeResourceRows, Storage } from '../../utilities';

export default function getEwtDaten(
  data?: IMonatsDaten['EWT'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['EWT'] {
  if (!Storage.check('Benutzer')) return [];

  const rows =
    data === undefined
      ? Storage.check('dataE')
        ? normalizeResourceRows<IDatenEWT>(Storage.get<unknown>('dataE', true))
        : []
      : normalizeResourceRows<IDatenEWT>(data);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? (Storage.check('Monat') ? Storage.get<number>('Monat', true) : undefined);
  if (!activeMonat) return [];

  return rows.filter(item => isEwtInMonat(item, activeMonat));
}
