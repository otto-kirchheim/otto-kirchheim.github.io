import type { IDatenBE } from '@/types';
import { filterByMonat, getMonatFromBE } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

/** Liefert die Bereitschaftseinsätze (BE) aus `data` bzw. dem Storage, standardmäßig auf den gewählten Monat gefiltert. */
export default createDatenGetter<IDatenBE>({
  storageKey: 'dataBE',
  /**
   * Wählt die Einsätze des Monats.
   *
   * @param rows - Alle Einsätze.
   * @param activeMonat - Monat (1-12).
   */
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromBE),
});
