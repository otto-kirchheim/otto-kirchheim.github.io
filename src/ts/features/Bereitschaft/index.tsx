import { featureLifecycleRegistry } from '@/core/hooks';
import { mountBereitschaftTab, unmountBereitschaftTab } from './BereitschaftTab';

featureLifecycleRegistry.registerFeature({
  name: 'Bereitschaft',
  async register(): Promise<void> {
    mountBereitschaftTab();
  },
  async unregister(): Promise<void> {
    unmountBereitschaftTab();
  },
});
