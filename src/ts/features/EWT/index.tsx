import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { EwtTab } from './EwtTab';

function mountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  mount(container, <EwtTab />);
}

function unmountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'EWT',
  async register(): Promise<void> {
    mountEwtTab();
  },
  async unregister(): Promise<void> {
    unmountEwtTab();
  },
});
