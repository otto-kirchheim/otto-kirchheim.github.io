import type { FeatureMeta } from '@/core/hooks';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
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
      // Zulagen gibt es erst ab 2024.
      minYear: 2024,
      filterMinYear: 2024,
    },
  ],
  legacyDefaultOn: true,
  legacy: { lifecycleName: 'Neben', tabKey: 'neben', paneId: 'Neben', rootId: 'neben-root', navId: 'neben-tab' },
  // Verknuepfte Zeiten (EWT) muessen auch bei deaktiviertem Tab synchron bleiben.
  wakeOn: ['ewt:persisted'],
};
