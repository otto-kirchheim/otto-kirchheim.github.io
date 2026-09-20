import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features EZ (Erschwerniszulagen, bisher Neben); kein Feature-Code importieren. */
export const ezMeta: FeatureMeta = {
  id: 'ez',
  label: 'Zulagen',
  longLabel: 'Erschwerniszulagen',
  icon: 'cash',
  order: 3,
  resources: ['N'],
  legacyDefaultOn: true,
  legacy: { lifecycleName: 'Neben', tabKey: 'neben', paneId: 'Neben', rootId: 'neben-root', navId: 'neben-tab' },
  // Verknuepfte Zeiten (EWT) muessen auch bei deaktiviertem Tab synchron bleiben.
  wakeOn: ['ewt:persisted'],
};
