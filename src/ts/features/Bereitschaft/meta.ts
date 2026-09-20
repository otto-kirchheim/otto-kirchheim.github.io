import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features Bereitschaft; kein Feature-Code importieren. */
export const berMeta: FeatureMeta = {
  id: 'ber',
  label: 'Bereitschaft',
  icon: 'calendar',
  order: 1,
  resources: ['BZ', 'BE'],
  legacyDefaultOn: true,
  legacy: {
    lifecycleName: 'Bereitschaft',
    tabKey: 'bereitschaft',
    paneId: 'Bereitschaft',
    rootId: 'bereitschaft-root',
    navId: 'bereitschaft-tab',
  },
};
