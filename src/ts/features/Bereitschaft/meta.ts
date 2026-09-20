import type { FeatureMeta } from '@/core/hooks';
import { getMonatFromBE, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import type { IDatenBE, IDatenBZ } from '@/types';

/** Eager gehaltene Beschreibung des Features Bereitschaft; kein Feature-Code importieren. */
export const berMeta: FeatureMeta = {
  id: 'ber',
  label: 'Bereitschaft',
  icon: 'calendar',
  order: 1,
  resources: [
    {
      key: 'BZ',
      storageKey: 'dataBZ',
      tableId: 'tableBZ',
      beschreibung: 'Bereitschaftszeit',
      monatOf: row => getMonatFromBZ(row as IDatenBZ),
    },
    {
      key: 'BE',
      storageKey: 'dataBE',
      tableId: 'tableBE',
      beschreibung: 'Bereitschaftseinsatz',
      monatOf: row => getMonatFromBE(row as IDatenBE),
    },
  ],
  legacyDefaultOn: true,
  legacy: {
    lifecycleName: 'Bereitschaft',
    tabKey: 'bereitschaft',
    paneId: 'Bereitschaft',
    rootId: 'bereitschaft-root',
    navId: 'bereitschaft-tab',
  },
};
