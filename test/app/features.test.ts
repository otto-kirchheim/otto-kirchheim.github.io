import { describe, expect, it } from 'bun:test';
import '@/app/features';
import { featureLifecycleRegistry, featureRegistry } from '@/core/hooks';

describe('app/features (Manifest)', () => {
  it('registriert EA unter dem bisherigen Lifecycle-Namen und mit legacy-Werten', () => {
    expect(featureLifecycleRegistry.isFeatureRegistered('EA')).toBe(true);
    expect(featureRegistry.meta('ea')).toMatchObject({
      label: 'Entgeltausgleich',
      legacy: { lifecycleName: 'EA', tabKey: 'ea' },
      wakeOn: ['ewt:persisted'],
    });
  });

  it('EA liefert ui- und events-Teil aus eigenen Chunks', async () => {
    const results = await Promise.all([featureRegistry.load('ea', 'ui'), featureRegistry.load('ea', 'events')]);
    const [ui, events] = results;
    expect(typeof ui.mount).toBe('function');
    expect(typeof ui.unmount).toBe('function');
    expect(typeof events['ewt:persisted']).toBe('function');
  });
});
