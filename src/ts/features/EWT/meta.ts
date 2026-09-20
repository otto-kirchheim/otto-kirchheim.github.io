import type { FeatureMeta } from '@/core/hooks';
import { getMonatFromEWT, isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import type { IDatenEWT } from '@/types';

/** Eager gehaltene Beschreibung des Features EWT (Einsatzwechseltaetigkeit); kein Feature-Code importieren. */
export const ewtMeta: FeatureMeta = {
  id: 'ewt',
  label: 'EWT',
  icon: 'changeover',
  order: 2,
  resources: [
    {
      key: 'EWT',
      storageKey: 'dataE',
      tableId: 'tableE',
      beschreibung: 'EWT',
      monatOf: row => getMonatFromEWT(row as IDatenEWT),
      // Tabelle zeigt auch EWT, deren Buchungstag im Monat liegt.
      inMonat: (row, monat) => isEwtInMonat(row as IDatenEWT, monat),
    },
  ],
  legacyDefaultOn: true,
  legacy: { lifecycleName: 'EWT', tabKey: 'ewt', paneId: 'EWT', rootId: 'ewt-root', navId: 'ewt-tab' },
};
