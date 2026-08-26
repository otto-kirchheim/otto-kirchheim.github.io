import type { IDatenN } from '@/types';
import { filterByMonat, getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';
import { hydrateNebengeldRows } from './nebengeldZulagen';

export default createDatenGetter<IDatenN>({
  storageKey: 'dataN',
  minYear: 2024,
  normalize: hydrateNebengeldRows,
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromN),
});
