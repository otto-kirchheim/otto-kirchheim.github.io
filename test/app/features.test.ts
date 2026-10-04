import { describe, expect, it } from 'bun:test';
import '@/app/features';
import { publishEvent } from '@/shared/lib/events/appEvents';
import { featureLifecycleRegistry, featureRegistry } from '@/shared/lib/feature';
import Storage from '@/shared/lib/storage/Storage';

describe('app/features (Manifest)', () => {
  it('definiert ber, ewt, ez, ea in dieser Reihenfolge mit den bisherigen Lifecycle-Namen und Tab-Keys', () => {
    // Nur die Kern-Features: weitere (z. B. per `bun run new-feature`) haengen sich hinten an.
    const metas = featureRegistry.metas().filter(m => ['ber', 'ewt', 'ez', 'ea'].includes(m.id));
    expect(metas.map(m => m.id)).toEqual(['ber', 'ewt', 'ez', 'ea']);
    expect(metas.map(m => m.legacy.lifecycleName)).toEqual(['Bereitschaft', 'EWT', 'Neben', 'EA']);
    expect(metas.map(m => m.legacy.tabKey)).toEqual(['bereitschaft', 'ewt', 'neben', 'ea']);
    expect(metas.filter(m => m.legacyDefaultOn).map(m => m.id)).toEqual(['ber', 'ewt', 'ez']);
    expect(metas.flatMap(m => m.resources.map(r => r.key))).toEqual(['BZ', 'BE', 'EWT', 'N', 'EA']);
    expect(
      featureRegistry
        .resources()
        .map(r => [r.storageKey, r.tableId])
        .slice(0, 5),
    ).toEqual([
      ['dataBZ', 'tableBZ'],
      ['dataBE', 'tableBE'],
      ['dataE', 'tableE'],
      ['dataN', 'tableN'],
      ['dataEA', 'tableEA'],
    ]);
  });

  it('registriert EA unter dem bisherigen Lifecycle-Namen und mit legacy-Werten', () => {
    expect(featureLifecycleRegistry.isFeatureRegistered('EA')).toBe(true);
    expect(featureRegistry.meta('ea')).toMatchObject({
      label: 'Entgeltausgleich',
      legacy: { lifecycleName: 'EA', tabKey: 'ea' },
      wakeOn: ['ewt:persisted', 'ewt:deleted'],
    });
  });

  it('EA liefert ui- und events-Teil aus eigenen Chunks', async () => {
    const results = await Promise.all([featureRegistry.load('ea', 'ui'), featureRegistry.load('ea', 'events')]);
    const [ui, events] = results;
    expect(typeof ui.mount).toBe('function');
    expect(typeof ui.unmount).toBe('function');
    expect(typeof events['ewt:persisted']).toBe('function');
  });

  it('jedes Feature liefert einen data-Teil mit tableRows fuer genau seine Ressourcen', async () => {
    for (const result of await featureRegistry.loadAll('data')) {
      if (!result.ok) throw result.error;
      const meta = featureRegistry.meta(result.id)!;
      expect(Object.keys(result.part.tableRows).sort()).toEqual(meta.resources.map(r => r.key).sort());
    }
  });

  it('ewt:deleted loest die EWT-Verweise in dataN und dataEA, auch ohne gemounteten Tab (Wake-Event)', async () => {
    await Promise.all([featureRegistry.load('ez', 'events'), featureRegistry.load('ea', 'events')]);
    Storage.set('dataN', [
      { _id: 'n1', EWT: 'e1' },
      { _id: 'n2', EWT: 'e2' },
    ]);
    Storage.set('dataEA', [{ _id: 'a1', EWT: 'e1' }]);

    publishEvent('ewt:deleted', { ids: ['e1'] });

    expect(Storage.get<{ _id: string; EWT?: string }[]>('dataN', { check: true })).toEqual([
      { _id: 'n1' },
      { _id: 'n2', EWT: 'e2' },
    ]);
    expect(Storage.get<{ _id: string; EWT?: string }[]>('dataEA', { check: true })).toEqual([{ _id: 'a1' }]);
  });

  it('meldet je Feature das PDF-Formular mit den bisherigen Werten an und liefert den pdf-Teil', async () => {
    const mitPdf = featureRegistry.metas().filter(m => m.pdf);
    expect(mitPdf.map(m => [m.pdf?.modus, m.pdf?.formular, m.pdf?.dateiPraefix]).slice(0, 4)).toEqual([
      ['B', 'bereitschaft', 'RB'],
      ['E', 'ewt', 'Verpf.'],
      ['N', 'ez', 'EZ'],
      ['EA', 'ea', 'Entgeltausgleich'],
    ]);
    for (const meta of mitPdf) {
      const pdf = await featureRegistry.load(meta.id, 'pdf');
      expect(typeof pdf.baueDaten).toBe('function');
    }
  });
});
