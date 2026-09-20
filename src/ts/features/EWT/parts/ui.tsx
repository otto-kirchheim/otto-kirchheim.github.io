import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/core/hooks';
import { EwtTab } from '../EwtTab';

/** Tab-Teil des Features EWT: mountet `EwtTab` in `#ewt-root`; ohne Container passiert nichts. */
const ui: FeatureParts['ui'] = {
  mount(): void {
    const container = document.querySelector<HTMLDivElement>('#ewt-root');
    if (!container) return;

    mount(container, <EwtTab />);
  },
  unmount(): void {
    const container = document.querySelector<HTMLDivElement>('#ewt-root');
    if (!container) return;

    unmount(container);
  },
};

export default ui;
