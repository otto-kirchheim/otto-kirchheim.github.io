import type { IDatenBE, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromBE, normalizeResourceRows, Storage } from '../../utilities';

export default function getBereitschaftsEinsatzDaten(
  data?: IMonatsDaten['BE'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BE'] {
  if (!Storage.check('Benutzer')) return [];

  const rows =
    data === undefined
      ? Storage.check('dataBE')
        ? normalizeResourceRows<IDatenBE>(Storage.get<unknown>('dataBE', true))
        : []
      : normalizeResourceRows<IDatenBE>(data);

  if (options?.scope === 'all') return rows;

  const activeMonat = Monat ?? (Storage.check('Monat') ? Storage.get<number>('Monat', true) : undefined);
  if (!activeMonat) return [];

  return filterByMonat(rows, activeMonat, getMonatFromBE);
}
