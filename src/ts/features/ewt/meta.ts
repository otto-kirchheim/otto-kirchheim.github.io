import type { FeatureMeta } from '@/shared/lib/feature';
import { createResourceApi } from '@/shared/api/resourceApi';
import { periodFromDate } from '@/shared/lib/date/periodFromDate';
import { ewtApi, ewtFromBackend } from './model/backend';
import { getMonatFromEWT, isEwtInMonat } from '@/shared/lib/date/getMonatFromItem';
import type { IDatenEWT } from '@/types';
import { publishEvent } from '@/shared/lib/events/appEvents';
import getEwtWindow from './model/getEwtWindow';

/** Eager gehaltene Beschreibung des Features EWT (Einsatzwechseltaetigkeit); nur kleine, UI-freie Helfer aus `model/` importieren (Backend-Mapper, Monat, Zeitfenster). */
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
      overlapWindow: row => {
        const window = getEwtWindow(row as IDatenEWT);
        return window && { start: window.start.valueOf(), end: window.end.valueOf() };
      },
      // Verknuepfte Features (EZ, EA) loesen ihre EWT-Verweise auf die geloeschten Ids, auch ohne gemounteten Tab.
      onDeleted: ids => publishEvent('ewt:deleted', { ids }),
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
