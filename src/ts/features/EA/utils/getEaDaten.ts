import type { IDatenEA } from '@/types';
import { filterByMonat, getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import { createDatenGetter } from '@/infrastructure/data/createDatenGetter';

// Backend erzwingt Jahr >= 2025 für Entgeltausgleich (§6 FGrTV, kein Legacy-Bestand davor).
export default createDatenGetter<IDatenEA>({
  storageKey: 'dataEA',
  minYear: 2025,
  filterRows: (rows, activeMonat) => filterByMonat(rows, activeMonat, getMonatFromEA),
});
