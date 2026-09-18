import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { BereitschaftTab } from './BereitschaftTab';

function mountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  mount(container, <BereitschaftTab />);
}

function unmountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'Bereitschaft',
  async register(): Promise<void> {
    mountBereitschaftTab();
  },
  async unregister(): Promise<void> {
    unmountBereitschaftTab();
  },
});
