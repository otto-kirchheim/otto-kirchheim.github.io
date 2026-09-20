import { describe, expect, it } from 'bun:test';
import '@/app/features';
import { featureLifecycleRegistry, featureRegistry } from '@/core/hooks';

describe('app/features (Manifest)', () => {
  it('definiert ber, ewt, ez, ea in dieser Reihenfolge mit den bisherigen Lifecycle-Namen und Tab-Keys', () => {
    const metas = featureRegistry.metas();
    expect(metas.map(m => m.id)).toEqual(['ber', 'ewt', 'ez', 'ea']);
    expect(metas.map(m => m.legacy.lifecycleName)).toEqual(['Bereitschaft', 'EWT', 'Neben', 'EA']);
    expect(metas.map(m => m.legacy.tabKey)).toEqual(['bereitschaft', 'ewt', 'neben', 'ea']);
    expect(metas.filter(m => m.legacyDefaultOn).map(m => m.id)).toEqual(['ber', 'ewt', 'ez']);
    expect(metas.flatMap(m => m.resources)).toEqual(['BZ', 'BE', 'EWT', 'N', 'EA']);
  });

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
