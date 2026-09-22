import type { IDatenEA } from '@/types';
import { filterByMonat, getMonatFromEA } from '@/shared/lib/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

// Backend erzwingt Jahr >= 2025 für Entgeltausgleich (kein Bestand davor).
export default createDatenGetter<IDatenEA>({
  storageKey: 'dataEA',
  minYear: 2025,
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromEA),
});
