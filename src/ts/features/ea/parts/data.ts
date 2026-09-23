import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenEA } from '@/types';
import { getEaDaten } from '../model';

/** Daten-Teil des Features EA: Tabellenzeilen (alle Monate) aus Rohzeilen von Storage/Server. */
const data: FeatureParts['data'] = {
  tableRows: {
    EA: rows => getEaDaten(rows as IDatenEA[], undefined, { scope: 'all' }),
  },
};

export default data;
