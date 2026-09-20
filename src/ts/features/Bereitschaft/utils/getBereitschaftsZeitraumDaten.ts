import type { IDatenBZ, IDataQueryOptions, IMonatsDaten } from '@/types';
import { filterByMonat, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { default as normalizeResourceRows } from '@/infrastructure/data/normalizeResourceRows';
import { default as Storage } from '@/infrastructure/storage/Storage';

/**
 * Liefert die Bereitschaftszeiträume (BZ) aus `data` bzw. dem Storage, standardmäßig auf den Monat gefiltert.
 *
 * @param data - Optionale Quelle statt Storage (`dataBZ`).
 * @param Monat - Monat (1-12); Standard: gewählter Monat.
 * @param options - `excludeDeleted` blendet lokal gelöschte Zeilen aus, `scope: 'all'` liefert alle Monate.
 * @returns Bereitschaftszeiträume (BZ); leer ohne angemeldeten Benutzer.
 */
export default function getBereitschaftsZeitraumDaten(
  data?: IMonatsDaten['BZ'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['BZ'] {
  if (!Storage.check('Benutzer')) return [];

  const sourceData = data ?? Storage.get<unknown>('dataBZ', { default: [] });
  const rows = normalizeResourceRows<IDatenBZ>(sourceData);
  const filteredRows = options?.excludeDeleted ? rows.filter(row => row.__localState !== 'deleted') : rows;

  if (options?.scope === 'all') return filteredRows;

  const activeMonat = Monat ?? getStoredMonatJahr().monat;
  return activeMonat ? filterByMonat(filteredRows, activeMonat, getMonatFromBZ) : [];
}
