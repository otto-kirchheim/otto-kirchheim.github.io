import { afterEach, describe, expect, it, vi } from 'bun:test';
import { featureLifecycleRegistry } from '@/core/hooks';

const ctx = { isAdmin: false, userName: 'TestUser' };

describe('featureLifecycleRegistry', () => {
  afterEach(() => {
    featureLifecycleRegistry.clearAll();
  });

  it('registerFeature + initializeAll calls register()', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    featureLifecycleRegistry.registerFeature({ name: 'Test', register });
    await featureLifecycleRegistry.initializeAll(ctx);
    expect(register).toHaveBeenCalledWith(ctx);
  });

  it('teardownAll calls unregister() in reverse order', async () => {
    const calls: string[] = [];
    featureLifecycleRegistry.registerFeature({
      name: 'A',
      register: vi.fn(),
      unregister: async () => {
        calls.push('A');
      },
    });
    featureLifecycleRegistry.registerFeature({
      name: 'B',
      register: vi.fn(),
      unregister: async () => {
        calls.push('B');
      },
    });
    await featureLifecycleRegistry.teardownAll();
    expect(calls).toEqual(['B', 'A']);
  });

  it('skips duplicate registration with a warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const register1 = vi.fn();
    const register2 = vi.fn();
    featureLifecycleRegistry.registerFeature({ name: 'Dup', register: register1 });
    featureLifecycleRegistry.registerFeature({ name: 'Dup', register: register2 });
    await featureLifecycleRegistry.initializeAll(ctx);
    expect(register1).toHaveBeenCalledTimes(1);
    expect(register2).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('invokeLifecycle fires afterLoad hooks across features', async () => {
    const afterLoad1 = vi.fn();
    const afterLoad2 = vi.fn();
    featureLifecycleRegistry.registerFeature({
      name: 'Feat1',
      register: vi.fn(),
      lifecycle: { afterLoad: afterLoad1 },
    });
    featureLifecycleRegistry.registerFeature({
      name: 'Feat2',
      register: vi.fn(),
      lifecycle: { afterLoad: afterLoad2 },
    });
    await featureLifecycleRegistry.invokeLifecycle('afterLoad');
    expect(afterLoad1).toHaveBeenCalled();
    expect(afterLoad2).toHaveBeenCalled();
  });

  it('invokeLifecycle skips features without the stage', async () => {
    const beforeSave = vi.fn();
    featureLifecycleRegistry.registerFeature({
      name: 'NoHook',
      register: vi.fn(),
    });
    featureLifecycleRegistry.registerFeature({
      name: 'WithHook',
      register: vi.fn(),
      lifecycle: { beforeSave },
    });
    await featureLifecycleRegistry.invokeLifecycle('beforeSave');
    expect(beforeSave).toHaveBeenCalledTimes(1);
  });

  it('invokeLifecycle catches errors and calls onError', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    featureLifecycleRegistry.registerFeature({
      name: 'Broken',
      register: vi.fn(),
      lifecycle: {
        afterLoad: () => {
          throw new Error('boom');
        },
        onError,
      },
    });
    await featureLifecycleRegistry.invokeLifecycle('afterLoad');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    errorSpy.mockRestore();
  });

  it('isFeatureRegistered returns correct boolean', () => {
    featureLifecycleRegistry.registerFeature({ name: 'Present', register: vi.fn() });
    expect(featureLifecycleRegistry.isFeatureRegistered('Present')).toBe(true);
    expect(featureLifecycleRegistry.isFeatureRegistered('Absent')).toBe(false);
  });

  it('getFeature gibt registriertes Feature zurück, undefined für unbekanntes', () => {
    const feature = { name: 'Known', register: vi.fn() };
    featureLifecycleRegistry.registerFeature(feature);
    expect(featureLifecycleRegistry.getFeature('Known')).toBe(feature);
    expect(featureLifecycleRegistry.getFeature('Unknown')).toBeUndefined();
  });

  it('initializeAll wirft weiter wenn register fehlschlägt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    featureLifecycleRegistry.registerFeature({
      name: 'Broken',
      register: vi.fn().mockRejectedValue(new Error('init failed')),
    });

    await expect(featureLifecycleRegistry.initializeAll(ctx)).rejects.toThrow('init failed');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Feature 'Broken'"), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('teardownAll wirft nicht weiter wenn unregister fehlschlägt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    featureLifecycleRegistry.registerFeature({
      name: 'BrokenTeardown',
      register: vi.fn(),
      unregister: async () => {
        throw new Error('teardown failed');
      },
    });

    await expect(featureLifecycleRegistry.teardownAll()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Feature 'BrokenTeardown'"), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('invokeOnError fängt Fehler im onError-Handler ab', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    featureLifecycleRegistry.registerFeature({
      name: 'ErrorHandler',
      register: vi.fn(),
      lifecycle: {
        onError: async () => {
          throw new Error('handler failed');
        },
      },
    });

    await expect(
      featureLifecycleRegistry.invokeOnError('ErrorHandler', new Error('original')),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Feature 'ErrorHandler'"), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('invokeOnError gibt sofort zurück wenn kein onError-Hook vorhanden', async () => {
    featureLifecycleRegistry.registerFeature({ name: 'NoOnError', register: vi.fn() });
    await expect(featureLifecycleRegistry.invokeOnError('NoOnError', new Error('x'))).resolves.toBeUndefined();
  });
});
