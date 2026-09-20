import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { clearAllEventListeners, publishEvent } from '@/core/events/appEvents';
import { featureLifecycleRegistry, featureRegistry } from '@/core/hooks';
import type { FeatureDefinition, FeatureMeta } from '@/core/hooks';

const ctx = { isAdmin: false, userName: 'TestUser' };

function meta(id: string, order: number, wakeOn?: FeatureMeta['wakeOn']): FeatureMeta {
  return {
    id,
    label: id.toUpperCase(),
    icon: 'cash',
    order,
    resources: [],
    legacyDefaultOn: true,
    legacy: { lifecycleName: id.toUpperCase(), tabKey: id, paneId: id, rootId: `${id}-root`, navId: `${id}-tab` },
    wakeOn,
  };
}

/** Definition mit zaehlbaren Ladern statt echter Chunks. */
function definition(id: string, order: number, options: { wakeOn?: FeatureMeta['wakeOn'] } = {}) {
  const mount = vi.fn();
  const unmount = vi.fn();
  const handler = vi.fn();
  const loadUi = vi.fn(async () => ({ default: { mount, unmount } }));
  const loadEvents = vi.fn(async () => ({ default: { 'ewt:persisted': handler } }));
  const def: FeatureDefinition = {
    meta: meta(id, order, options.wakeOn),
    parts: { ui: loadUi, events: loadEvents },
  };
  return { def, mount, unmount, handler, loadUi, loadEvents };
}

describe('featureRegistry', () => {
  beforeEach(() => {
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
    clearAllEventListeners();
  });
  afterEach(() => {
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
    clearAllEventListeners();
  });

  it('define registriert unter dem Lifecycle-Namen; register laedt den ui-Teil und mountet', async () => {
    const a = definition('ea', 1);
    featureRegistry.define(a.def);

    expect(featureLifecycleRegistry.isFeatureRegistered('EA')).toBe(true);
    expect(a.loadUi).not.toHaveBeenCalled();

    await featureLifecycleRegistry.initializeAll(ctx);
    expect(a.loadUi).toHaveBeenCalledTimes(1);
    expect(a.mount).toHaveBeenCalledTimes(1);
  });

  it('unregister unmountet nur, wenn der ui-Teil geladen wurde (kein Chunk-Laden zum Abbau)', async () => {
    const a = definition('ea', 1);
    featureRegistry.define(a.def);

    await featureLifecycleRegistry.teardownAll();
    expect(a.loadUi).not.toHaveBeenCalled();
    expect(a.unmount).not.toHaveBeenCalled();

    await featureLifecycleRegistry.initializeAll(ctx);
    await featureLifecycleRegistry.teardownAll();
    expect(a.unmount).toHaveBeenCalledTimes(1);
  });

  it('load laedt je Teil genau einmal, auch bei gleichzeitigen Aufrufen', async () => {
    const a = definition('ea', 1);
    featureRegistry.define(a.def);

    const [x, y] = await Promise.all([featureRegistry.load('ea', 'ui'), featureRegistry.load('ea', 'ui')]);
    expect(x).toBe(y);
    await featureRegistry.load('ea', 'ui');
    expect(a.loadUi).toHaveBeenCalledTimes(1);
  });

  it('ein fehlgeschlagener Chunk wird nicht gecacht: der naechste load versucht es erneut', async () => {
    const mount = vi.fn();
    const loadUi = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: { mount, unmount: vi.fn() } });
    featureRegistry.define({ meta: meta('ea', 1), parts: { ui: loadUi } });

    await expect(featureRegistry.load('ea', 'ui')).rejects.toThrow('Failed to fetch');
    const ui = await featureRegistry.load('ea', 'ui');
    ui.mount();
    expect(loadUi).toHaveBeenCalledTimes(2);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('load lehnt unbekanntes Feature und fehlenden Teil ab', async () => {
    featureRegistry.define({ meta: meta('ea', 1), parts: {} });
    await expect(featureRegistry.load('nope', 'ui')).rejects.toThrow("Feature 'nope' hat keinen Teil 'ui'");
    await expect(featureRegistry.load('ea', 'ui')).rejects.toThrow("Feature 'ea' hat keinen Teil 'ui'");
  });

  it('loadMany: ein Ausfall blockiert die anderen nicht, Reihenfolge wie ids', async () => {
    const a = definition('a', 1);
    featureRegistry.define(a.def);
    featureRegistry.define({
      meta: meta('b', 2),
      parts: {
        ui: async () => {
          throw new Error('offline');
        },
      },
    });

    const results = await featureRegistry.loadMany(['b', 'a'], 'ui');
    expect(results.map(r => [r.id, r.ok])).toEqual([
      ['b', false],
      ['a', true],
    ]);
    const failed = results[0];
    expect(failed.ok === false && failed.error.message).toBe('offline');
  });

  it('metas/loadAll liefern die Features nach order sortiert; jede Teilmenge funktioniert', async () => {
    featureRegistry.define(definition('z', 3).def);
    featureRegistry.define(definition('a', 1).def);
    featureRegistry.define(definition('m', 2).def);

    expect(featureRegistry.metas().map(m => m.id)).toEqual(['a', 'm', 'z']);
    expect((await featureRegistry.loadAll('ui')).map(r => r.id)).toEqual(['a', 'm', 'z']);
    expect(featureRegistry.meta('m')?.label).toBe('M');
    expect(featureRegistry.meta('x')).toBeUndefined();
  });

  it('doppelte id: Warnung, das erste Feature bleibt', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = definition('ea', 1);
    featureRegistry.define(first.def);
    featureRegistry.define(definition('ea', 2).def);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(featureRegistry.meta('ea')?.order).toBe(1);
    warn.mockRestore();
  });

  it('Wake-Event: der events-Teil laedt frueh, danach werden Events synchron zugestellt', async () => {
    const a = definition('ea', 1, { wakeOn: ['ewt:persisted'] });
    featureRegistry.define(a.def);
    await featureRegistry.load('ea', 'events');

    publishEvent('ewt:persisted', { rows: [] });
    expect(a.handler).toHaveBeenCalledTimes(1);
    expect(a.loadEvents).toHaveBeenCalledTimes(1);
  });

  it('Wake-Event vor dem Laden: geht nicht verloren und behaelt die Reihenfolge', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>(resolve => (release = resolve));
    const seen: number[] = [];
    const loadEvents = vi.fn(async () => {
      await gate;
      return { default: { 'ewt:persisted': ({ rows }: { rows: unknown[] }) => seen.push(rows.length) } };
    });
    featureRegistry.define({ meta: meta('ea', 1, ['ewt:persisted']), parts: { events: loadEvents as never } });

    publishEvent('ewt:persisted', { rows: [] });
    publishEvent('ewt:persisted', { rows: [{}, {}] as never });
    expect(seen).toEqual([]);

    release();
    await gate;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(seen).toEqual([0, 2]);
    expect(loadEvents).toHaveBeenCalledTimes(1);
  });

  it('Wake-Event bei fehlgeschlagenem Chunk: Fehler wird geloggt, spaeteres Event versucht es erneut', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = vi.fn();
    const loadEvents = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ default: { 'ewt:persisted': handler } });
    featureRegistry.define({ meta: meta('ea', 1, ['ewt:persisted']), parts: { events: loadEvents } });
    await new Promise(resolve => setTimeout(resolve, 0));

    publishEvent('ewt:persisted', { rows: [] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(loadEvents).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
