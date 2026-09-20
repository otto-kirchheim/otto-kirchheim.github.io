import type { FeatureMeta } from '@/core/hooks';
import { getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import type { IDatenEA } from '@/types';

/** Eager gehaltene Beschreibung des Features EA (Entgeltausgleich); kein Feature-Code importieren. */
export const eaMeta: FeatureMeta = {
  id: 'ea',
  label: 'Entgeltausgleich',
  icon: 'euro_sign',
  order: 4,
  resources: [
    {
      key: 'EA',
      storageKey: 'dataEA',
      tableId: 'tableEA',
      beschreibung: 'Entgeltausgleich',
      monatOf: row => getMonatFromEA(row as IDatenEA),
      // Backend erzwingt Jahr >= 2025. Der Monatswechsel (`changeMonatJahr`) filtert bisher ohne dieses Gate
      // (`filterMinYear` fehlt bewusst): Latent-Bug, wird in eigenem Schritt angeglichen.
      minYear: 2025,
    },
  ],
  // Bewusst aus: der Tab mountet nur bei explizitem 'ea' in aktivierteTabs, nicht fuer Bestands- und Neu-User.
  legacyDefaultOn: false,
  legacy: { lifecycleName: 'EA', tabKey: 'ea', paneId: 'EA', rootId: 'ea-root', navId: 'ea-tab' },
  // Verknuepfte EA-Dauern muessen auch bei deaktiviertem EA-Tab mit EWT synchron bleiben.
  wakeOn: ['ewt:persisted'],
};
