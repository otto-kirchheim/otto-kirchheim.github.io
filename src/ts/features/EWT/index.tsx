import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { EwtTab } from './EwtTab';

/** Mountet `EwtTab` in `#ewt-root`; ohne Container passiert nichts. */
function mountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  mount(container, <EwtTab />);
}

/** Unmountet `EwtTab` aus `#ewt-root`; ohne Container passiert nichts. */
function unmountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'EWT',
  /** Feature-Lifecycle: mountet den EWT-Tab. */
  async register(): Promise<void> {
    mountEwtTab();
  },
  /** Feature-Lifecycle: unmountet den EWT-Tab. */
  async unregister(): Promise<void> {
    unmountEwtTab();
  },
});
