import type { FeatureParts } from '@/shared/lib/feature';
import type { IDatenN } from '@/types';
import { getNebengeldDaten } from '../utils';

/** Daten-Teil des Features EZ (Neben): Tabellenzeilen (alle Monate, Zulagen hydriert) aus Rohzeilen von Storage/Server. */
const data: FeatureParts['data'] = {
  tableRows: {
    N: rows => getNebengeldDaten(rows as IDatenN[], undefined, { scope: 'all' }),
  },
};

export default data;
