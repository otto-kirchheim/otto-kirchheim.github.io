import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features EA (Entgeltausgleich); kein Feature-Code importieren. */
export const eaMeta: FeatureMeta = {
  id: 'ea',
  label: 'Entgeltausgleich',
  icon: 'euro_sign',
  order: 4,
  resources: ['EA'],
  // Bewusst aus: der Tab mountet nur bei explizitem 'ea' in aktivierteTabs, nicht fuer Bestands- und Neu-User.
  legacyDefaultOn: false,
  legacy: { lifecycleName: 'EA', tabKey: 'ea', paneId: 'EA', rootId: 'ea-root', navId: 'ea-tab' },
  // Verknuepfte EA-Dauern muessen auch bei deaktiviertem EA-Tab mit EWT synchron bleiben.
  wakeOn: ['ewt:persisted'],
};
