import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des EA-Features (Entgeltausgleich); kein Feature-Code importieren. */
export const eaMeta: FeatureMeta = {
  id: 'ea',
  label: 'Entgeltausgleich',
  order: 4,
  legacy: { lifecycleName: 'EA', tabKey: 'ea' },
  // Verknuepfte EA-Dauern muessen auch bei deaktiviertem EA-Tab mit EWT synchron bleiben.
  wakeOn: ['ewt:persisted'],
};
