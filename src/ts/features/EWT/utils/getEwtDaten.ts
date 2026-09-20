import type { IDatenEWT, IEwtQueryOptions } from '@/types';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

export default createDatenGetter<IDatenEWT, IEwtQueryOptions>({
  storageKey: 'dataE',
  /**
   * Monatsfilter: `options.filter` wählt Starttag, Buchungstag oder beide (Standard).
   *
   * @param rows - Zeilen vor dem Monatsfilter.
   * @param activeMonat - Monat (1-12).
   * @param options - Abfrageoptionen mit `filter`.
   * @returns Zeilen des Monats.
   */
  filterRows: (rows, activeMonat, options) =>
    rows.filter(item => isEwtInMonat(item, activeMonat, options?.filter ?? 'beide')),
});
