import type { IDatenBE, IDataQueryOptions, IMonatsDaten } from '../../interfaces';
import { filterByMonat, getMonatFromBE, getStoredMonatJahr, normalizeResourceRows, Storage } from '../../utilities';

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
