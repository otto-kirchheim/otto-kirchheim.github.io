import type { IDatenBE } from '@/types';
import { filterByMonat, getMonatFromBE } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

export default createDatenGetter<IDatenBE>({
  storageKey: 'dataBE',
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromBE),
});
