import type { FeatureParts } from '@/shared/lib/feature';
import type { IMonatsDaten } from '@/types';
import { getBereitschaftsEinsatzDaten, getBereitschaftsZeitraumDaten } from '../utils';

/** Daten-Teil des Features Bereitschaft: Tabellenzeilen (alle Monate) aus Rohzeilen von Storage/Server. */
const data: FeatureParts['data'] = {
  tableRows: {
    BZ: rows => getBereitschaftsZeitraumDaten(rows as IMonatsDaten['BZ'], undefined, { scope: 'all' }),
    BE: rows => getBereitschaftsEinsatzDaten(rows as IMonatsDaten['BE'], undefined, { scope: 'all' }),
  },
};

export default data;
