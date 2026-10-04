import type { IDatenN } from '@/types';
import { filterByMonat } from '@/shared/lib/date/getMonatFromItem';
import { getMonatFromN } from './monat';
import { createDatenGetter } from '@/shared/lib/ressource/createDatenGetter';
import { hydrateNebengeldRows } from './nebengeldZulagen';

/**
 * Liefert die Neben-Zeilen (erst ab 2024) aus dem Storage, nach Monat gefiltert und mit hydrierten Zulagen.
 *
 * @see createDatenGetter
 */
export default createDatenGetter<IDatenN>({
  storageKey: 'dataN',
  minYear: 2024,
  normalize: hydrateNebengeldRows,
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromN),
});
