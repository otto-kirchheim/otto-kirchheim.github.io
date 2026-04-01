import type { IDatenBZ, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromBZ, normalizeResourceRows, Storage } from '../../utilities';

export default function getBereitschaftsZeitraumDaten(
  data?: IMonatsDaten['BZ'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BZ'] {
  if (!Storage.check('Benutzer')) return [];

  const rows =
    data === undefined
      ? Storage.check('dataBZ')
        ? normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', true))
        : []
      : normalizeResourceRows<IDatenBZ>(data);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? (Storage.check('Monat') ? Storage.get<number>('Monat', true) : undefined);
  if (!activeMonat) return [];

  return filterByMonat(rows, activeMonat, getMonatFromBZ);
}
