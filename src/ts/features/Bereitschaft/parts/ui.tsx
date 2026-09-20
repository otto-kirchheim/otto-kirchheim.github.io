import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/core/hooks';
import { BereitschaftTab } from '../BereitschaftTab';

/** Tab-Teil des Features Bereitschaft: mountet `BereitschaftTab` in `#bereitschaft-root`; ohne Container passiert nichts. */
const ui: FeatureParts['ui'] = {
  mount(): void {
    const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
    if (!container) return;

    mount(container, <BereitschaftTab />);
  },
  unmount(): void {
    const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
    if (!container) return;

    unmount(container);
  },
};

export default ui;
