import type { FeatureMeta } from '@/core/hooks';
import { ewtApi } from '@/infrastructure/api/apiService';
import { createResourceApi } from '@/infrastructure/api/resourceApi';
import { periodFromDate } from '@/infrastructure/date/periodFromDate';
import { ewtFromBackend } from '@/infrastructure/data/fieldMapper';
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
      periodOf: row => periodFromDate((row as IDatenEWT).Tag, 'YYYY-MM-DD'),
      api: createResourceApi(ewtFromBackend, () => ewtApi),
      // Tabelle zeigt auch EWT, deren Buchungstag im Monat liegt.
      inMonat: (row, monat) => isEwtInMonat(row as IDatenEWT, monat),
    },
  ],
  legacyDefaultOn: true,
  pdf: { modus: 'E', formular: 'ewt', dateiPraefix: 'Verpf.' },
  legacy: {
    lifecycleName: 'EWT',
    tabKey: 'ewt',
    paneId: 'EWT',
    rootId: 'ewt-root',
    navId: 'ewt-tab',
    saveButtonId: 'btnSaveE',
  },
  helpKeys: ['tab.ewt', 'modal.ewt.add', 'modal.ewtEintrag.add', 'modal.ewtEintrag.edit'],
};
