import type { IDatenEA } from '@/types';
import { filterByMonat } from '@/shared/lib/date/getMonatFromItem';
import { getMonatFromEA } from './monat';
import { createDatenGetter } from '@/shared/lib/ressource/createDatenGetter';

// Backend erzwingt Jahr >= 2025 für Entgeltausgleich (kein Bestand davor).
export default createDatenGetter<IDatenEA>({
  storageKey: 'dataEA',
  minYear: 2025,
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromEA),
});
