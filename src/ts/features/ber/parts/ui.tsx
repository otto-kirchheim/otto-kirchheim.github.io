import { mount, unmount } from '@/shared/lib/react-root/reactRoot';
import type { FeatureParts } from '@/shared/lib/feature';
import { BereitschaftTab } from '../ui/BereitschaftTab';

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
