import type { FeatureMeta } from '@/shared/lib/feature';
import { nebengeldApi } from '@/shared/api/apiService';
import { createResourceApi } from '@/shared/api/resourceApi';
import { periodFromDate } from '@/shared/lib/date/periodFromDate';
import { nebengeldFromBackend } from '@/infrastructure/data/fieldMapper';
import { getMonatFromN } from '@/shared/lib/date/getMonatFromItem';
import type { IDatenN } from '@/types';

/** Eager gehaltene Beschreibung des Features EZ (Erschwerniszulagen, bisher Neben); kein Feature-Code importieren. */
export const ezMeta: FeatureMeta = {
  id: 'ez',
  label: 'Zulagen',
  longLabel: 'Erschwerniszulagen',
  icon: 'cash',
  order: 3,
  resources: [
    {
      key: 'N',
      storageKey: 'dataN',
      tableId: 'tableN',
      beschreibung: 'Erschwerniszulagen',
      monatOf: row => getMonatFromN(row as IDatenN),
      periodOf: row => periodFromDate((row as IDatenN).Tag, 'DD.MM.YYYY'),
      // Die EWT-Verknuepfung ergaenzt der Server; sie soll das Create-Matching nicht stoeren.
      signatureOmitKeys: ['EWT'],
      api: createResourceApi(nebengeldFromBackend, () => nebengeldApi),
      // Zulagen gibt es erst ab 2024.
      minYear: 2024,
      filterMinYear: 2024,
    },
  ],
  legacyDefaultOn: true,
  pdf: { modus: 'N', formular: 'ez', dateiPraefix: 'EZ' },
  legacy: {
    lifecycleName: 'Neben',
    tabKey: 'neben',
    paneId: 'Neben',
    rootId: 'neben-root',
    navId: 'neben-tab',
    saveButtonId: 'btnSaveN',
  },
  // Verknuepfte Zeiten (EWT) muessen auch bei deaktiviertem Tab synchron bleiben, ebenso die Verweise auf geloeschte EWT.
  wakeOn: ['ewt:persisted', 'ewt:deleted'],
  helpKeys: ['tab.neben', 'modal.neben.add', 'modal.nebenEintrag.add', 'modal.nebenEintrag.edit'],
};
