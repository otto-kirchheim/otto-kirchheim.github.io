import type { IDatenBE } from '@/types';
import { filterByMonat } from '@/shared/lib/date/getMonatFromItem';
import { getMonatFromBE } from './monat';
import { createDatenGetter } from '@/shared/lib/ressource/createDatenGetter';

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
