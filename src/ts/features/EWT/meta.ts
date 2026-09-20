import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features EWT (Einsatzwechseltaetigkeit); kein Feature-Code importieren. */
export const ewtMeta: FeatureMeta = {
  id: 'ewt',
  label: 'EWT',
  icon: 'changeover',
  order: 2,
  resources: ['EWT'],
  legacyDefaultOn: true,
  legacy: { lifecycleName: 'EWT', tabKey: 'ewt', paneId: 'EWT', rootId: 'ewt-root', navId: 'ewt-tab' },
};
