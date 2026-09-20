import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { BereitschaftTab } from './BereitschaftTab';

/**
 * Mountet den Bereitschaft-Tab in `#bereitschaft-root`; ohne den Container passiert nichts.
 */
function mountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  mount(container, <BereitschaftTab />);
}

/**
 * Entfernt den Bereitschaft-Tab aus `#bereitschaft-root`; ohne den Container passiert nichts.
 */
function unmountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'Bereitschaft',
  /**
   * Lifecycle-Hook: mountet den Tab.
   */
  async register(): Promise<void> {
    mountBereitschaftTab();
  },
  /**
   * Lifecycle-Hook: entfernt den Tab.
   */
  async unregister(): Promise<void> {
    unmountBereitschaftTab();
  },
});
