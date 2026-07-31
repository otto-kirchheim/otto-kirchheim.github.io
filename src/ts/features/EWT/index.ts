import { featureLifecycleRegistry } from '@/core/hooks';
import { mountEwtTab, unmountEwtTab } from './EwtTab';

featureLifecycleRegistry.registerFeature({
  name: 'EWT',
  async register(): Promise<void> {
    mountEwtTab();
  },
  async unregister(): Promise<void> {
    unmountEwtTab();
  },
});
