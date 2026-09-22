import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/shared/lib/feature';
import { EaTab } from '../EaTab';

/** Tab-Teil des EA-Features: mountet `EaTab` in `#ea-root`; ohne Container passiert nichts. */
const ui: FeatureParts['ui'] = {
  mount(): void {
    const container = document.querySelector<HTMLDivElement>('#ea-root');
    if (!container) return;

    mount(container, <EaTab />);
  },
  unmount(): void {
    const container = document.querySelector<HTMLDivElement>('#ea-root');
    if (!container) return;

    unmount(container);
  },
};

export default ui;
