import type { IDatenN, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromN, normalizeResourceRows, Storage } from '../../utilities';

export default function getNebengeldDaten(
  data?: IMonatsDaten['N'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['N'] {
  if (!Storage.check('Benutzer')) return [];
  const Jahr = Storage.get('Jahr', { default: new Date().getFullYear() });
  if (Jahr < 2024) return [];

  const rows =
    data === undefined
      ? Storage.check('dataN')
        ? normalizeResourceRows<IDatenN>(Storage.get<unknown>('dataN', true))
        : []
      : normalizeResourceRows<IDatenN>(data);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? (Storage.check('Monat') ? Storage.get<number>('Monat', true) : undefined);
  if (!activeMonat) return [];

  return filterByMonat(rows, activeMonat, getMonatFromN);
}
