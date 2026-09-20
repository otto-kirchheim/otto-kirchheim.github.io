import type { FeatureMeta } from '@/core/hooks';
import { bereitschaftseinsatzApi, bereitschaftszeitraumApi } from '@/infrastructure/api/apiService';
import { createResourceApi } from '@/infrastructure/api/resourceApi';
import { periodFromDate } from '@/infrastructure/date/periodFromDate';
import { beFromBackend, bzFromBackend } from '@/infrastructure/data/fieldMapper';
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
      periodOf: row => periodFromDate((row as IDatenBZ).Beginn),
      api: createResourceApi(bzFromBackend, () => bereitschaftszeitraumApi),
    },
    {
      key: 'BE',
      storageKey: 'dataBE',
      tableId: 'tableBE',
      beschreibung: 'Bereitschaftseinsatz',
      monatOf: row => getMonatFromBE(row as IDatenBE),
      periodOf: row => periodFromDate((row as IDatenBE).Tag, 'DD.MM.YYYY'),
      api: createResourceApi(beFromBackend, () => bereitschaftseinsatzApi),
    },
  ],
  legacyDefaultOn: true,
  pdf: { modus: 'B', formular: 'bereitschaft', dateiPraefix: 'RB' },
  legacy: {
    lifecycleName: 'Bereitschaft',
    tabKey: 'bereitschaft',
    paneId: 'Bereitschaft',
    rootId: 'bereitschaft-root',
    navId: 'bereitschaft-tab',
    saveButtonId: 'btnSaveB',
  },
  helpKeys: [
    'tab.bereitschaft',
    'modal.bereitschaft.add',
    'modal.bereitschaftEintrag.add',
    'modal.bereitschaftEintrag.edit',
    'modal.bereitschaftEinsatz.add',
    'modal.bereitschaftEinsatzEintrag.add',
    'modal.bereitschaftEinsatzEintrag.edit',
    'modal.einstellungen.ve',
  ],
};
