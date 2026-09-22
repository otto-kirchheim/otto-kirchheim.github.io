import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/shared/lib/feature';
import { NebenTab } from '../NebenTab';

/** Tab-Teil des Features EZ: mountet `NebenTab` in `#neben-root`; ohne Container passiert nichts. */
const ui: FeatureParts['ui'] = {
  mount(): void {
    const container = document.querySelector<HTMLDivElement>('#neben-root');
    if (!container) return;

    mount(container, <NebenTab />);
  },
  unmount(): void {
    const container = document.querySelector<HTMLDivElement>('#neben-root');
    if (!container) return;

    unmount(container);
  },
};

export default ui;
