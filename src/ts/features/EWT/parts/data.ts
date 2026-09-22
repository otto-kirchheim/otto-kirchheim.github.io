import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenEWT } from '@/types';
import { getEwtDaten } from '../utils';

/** Daten-Teil des Features EWT: Tabellenzeilen (alle Monate) aus Rohzeilen von Storage/Server. */
const data: FeatureParts['data'] = {
  tableRows: {
    EWT: rows => getEwtDaten(rows as IDatenEWT[], undefined, { scope: 'all' }),
  },
};

export default data;
