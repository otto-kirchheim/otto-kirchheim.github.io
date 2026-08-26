import type { IDatenEWT, IEwtQueryOptions } from '@/types';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

export default createDatenGetter<IDatenEWT, IEwtQueryOptions>({
  storageKey: 'dataE',
  filterRows: (rows, activeMonat, options) =>
    rows.filter(item => isEwtInMonat(item, activeMonat, options?.filter ?? 'beide')),
});
