import type { IDatenEA, IDataQueryOptions, IMonatsDaten } from '@/types';
import { filterByMonat, getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { default as normalizeResourceRows } from '@/infrastructure/data/normalizeResourceRows';
import Storage from '@/infrastructure/storage/Storage';

export default function getEaDaten(
  data?: IMonatsDaten['EA'],
  Monat?: number,
  options?: IDataQueryOptions,
): IMonatsDaten['EA'] {
  if (!Storage.check('Benutzer')) return [];

  const { monat: storedMonat, jahr } = getStoredMonatJahr();
  // Backend erzwingt Jahr >= 2025 für Entgeltausgleich (§6 FGrTV, kein Legacy-Bestand davor).
  if (jahr < 2025) return [];

  const sourceData = data ?? Storage.get<unknown>('dataEA', { default: [] });
  const rows = normalizeResourceRows<IDatenEA>(sourceData);
  const filteredRows = options?.excludeDeleted ? rows.filter(row => row.__localState !== 'deleted') : rows;

  if (options?.scope === 'all') return filteredRows;

  const activeMonat = Monat ?? storedMonat;
  return activeMonat ? filterByMonat(filteredRows, activeMonat, getMonatFromEA) : [];
}
