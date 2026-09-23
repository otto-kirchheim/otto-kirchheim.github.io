import type { IDatenN } from '@/types';
import { filterByMonat, getMonatFromN } from '@/shared/lib/date/getMonatFromItem';
import { createDatenGetter } from '@/shared/lib/ressource/createDatenGetter';
import { hydrateNebengeldRows } from '@/shared/lib/zulagen/nebengeldZulagen';

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
