import { beforeEach, describe, expect, it, vi } from 'bun:test';

const viCompat = vi as typeof vi & { hoisted: <T>(factory: () => T) => T };

const { mockHasPendingTableChanges, mockGetResourceStatus, mockCreateSnackBar } = viCompat.hoisted(() => ({
  mockHasPendingTableChanges: vi.fn(),
  mockGetResourceStatus: vi.fn(),
  mockCreateSnackBar: vi.fn(),
}));

vi.mock('@/shared/lib/autosave/autoSave', () => ({
  hasPendingTableChanges: mockHasPendingTableChanges,
  getResourceStatus: mockGetResourceStatus,
}));
vi.mock('@/shared/ui/snackbar/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));

import { featureLifecycleRegistry, featureRegistry } from '@/shared/lib/feature';
import { berMeta } from '@/features/ber/meta';
import { eaMeta } from '@/features/ea/meta';
import { ewtMeta } from '@/features/ewt/meta';
import { ezMeta } from '@/features/ez/meta';
import { resetFeatureTabSync, syncFeatureTabs } from '@/app/init/syncFeatureTabs';

describe('syncFeatureTabs', () => {
  let registerBereitschaft: ReturnType<typeof vi.fn>;
  let unregisterBereitschaft: ReturnType<typeof vi.fn>;
  let registerNeben: ReturnType<typeof vi.fn>;
  let unregisterNeben: ReturnType<typeof vi.fn>;
  let registerEA: ReturnType<typeof vi.fn>;
  let unregisterEA: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    featureLifecycleRegistry.clearAll();
    featureRegistry.clear();
    resetFeatureTabSync();

    mockHasPendingTableChanges.mockReturnValue(false);
    mockGetResourceStatus.mockReturnValue({ status: 'idle', timer: null, lastSaved: null, lastError: null });

    registerBereitschaft = vi.fn().mockResolvedValue(undefined);
    unregisterBereitschaft = vi.fn().mockResolvedValue(undefined);
    registerNeben = vi.fn().mockResolvedValue(undefined);
    unregisterNeben = vi.fn().mockResolvedValue(undefined);
    registerEA = vi.fn().mockResolvedValue(undefined);
    unregisterEA = vi.fn().mockResolvedValue(undefined);

    const ui = (mount: ReturnType<typeof vi.fn>, unmount: ReturnType<typeof vi.fn>) => async () => ({
      default: { mount, unmount },
    });
    featureRegistry.define({ meta: berMeta, parts: { ui: ui(registerBereitschaft, unregisterBereitschaft) } });
    featureRegistry.define({ meta: ewtMeta, parts: { ui: ui(vi.fn(), vi.fn()) } });
    featureRegistry.define({ meta: ezMeta, parts: { ui: ui(registerNeben, unregisterNeben) } });
    featureRegistry.define({ meta: eaMeta, parts: { ui: ui(registerEA, unregisterEA) } });
  });

  it('mountet ein Feature, das neu in aktivierteTabs aufgenommen wird', async () => {
    await syncFeatureTabs(['bereitschaft']);
    expect(registerBereitschaft).toHaveBeenCalledTimes(1);
  });

  it('mountet nicht erneut, wenn bereits gemountet (kein Zustandswechsel)', async () => {
    await syncFeatureTabs(['bereitschaft']);
    await syncFeatureTabs(['bereitschaft']);
    expect(registerBereitschaft).toHaveBeenCalledTimes(1);
  });

  it('unmountet ein Feature ohne offene Änderungen sofort', async () => {
    await syncFeatureTabs(['bereitschaft']);
    // '__dummy__' statt [] — [] bedeutet laut aktivierteTabs-Semantik "alle aktiv" (siehe updateTabVisibility.ts),
    // hier soll gezielt "keins der drei aktiv" simuliert werden.
    await syncFeatureTabs(['__dummy__']);
    expect(unregisterBereitschaft).toHaveBeenCalledTimes(1);
  });

  it('leere/undefined aktivierteTabs bedeutet: alle drei Legacy-Tabs mounten, EA NICHT', async () => {
    await syncFeatureTabs(undefined);
    expect(registerBereitschaft).toHaveBeenCalledTimes(1);
    expect(registerNeben).toHaveBeenCalledTimes(1);
    expect(registerEA).not.toHaveBeenCalled();
  });

  it('leeres Array verhält sich wie undefined: alle drei Legacy-Tabs mounten, EA NICHT', async () => {
    await syncFeatureTabs([]);
    expect(registerBereitschaft).toHaveBeenCalledTimes(1);
    expect(registerNeben).toHaveBeenCalledTimes(1);
    expect(registerEA).not.toHaveBeenCalled();
  });

  it('mountet EA nur, wenn aktivierteTabs "ea" explizit enthält', async () => {
    await syncFeatureTabs(['ea']);
    expect(registerEA).toHaveBeenCalledTimes(1);
    expect(registerBereitschaft).not.toHaveBeenCalled();
    expect(registerNeben).not.toHaveBeenCalled();
  });

  it('unmountet EA wieder, wenn "ea" aus aktivierteTabs entfernt wird', async () => {
    await syncFeatureTabs(['ea']);
    expect(registerEA).toHaveBeenCalledTimes(1);

    await syncFeatureTabs(['__dummy__']);
    expect(unregisterEA).toHaveBeenCalledTimes(1);
  });

  it('bricht Unmount ab und zeigt Warn-Snackbar, wenn Ressource noch ungesynchte Änderungen hat', async () => {
    await syncFeatureTabs(['neben']);
    mockHasPendingTableChanges.mockImplementation(resource => resource === 'N');

    await syncFeatureTabs(['__dummy__']);

    expect(unregisterNeben).not.toHaveBeenCalled();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'warning', message: expect.stringContaining('Erschwerniszulagen') }),
    );
  });

  it('bricht Unmount ab, wenn eine Ressource im error-Status ist', async () => {
    await syncFeatureTabs(['bereitschaft']);
    mockGetResourceStatus.mockImplementation(resource =>
      resource === 'BE' ? { status: 'error', timer: null, lastSaved: null, lastError: 'x' } : { status: 'idle' },
    );

    await syncFeatureTabs(['__dummy__']);

    expect(unregisterBereitschaft).not.toHaveBeenCalled();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('holt das Unmounten beim nächsten Aufruf nach, sobald keine offenen Änderungen mehr bestehen', async () => {
    await syncFeatureTabs(['neben']);
    mockHasPendingTableChanges.mockReturnValue(true);
    await syncFeatureTabs(['__dummy__']); // 1. Versuch: blockiert
    expect(unregisterNeben).not.toHaveBeenCalled();

    mockHasPendingTableChanges.mockReturnValue(false);
    await syncFeatureTabs(['__dummy__']); // 2. Versuch: erfolgreich

    expect(unregisterNeben).toHaveBeenCalledTimes(1);
  });

  it('resetFeatureTabSync setzt den Mount-Zustand zurück, ohne unregister aufzurufen', async () => {
    await syncFeatureTabs(['bereitschaft']);
    resetFeatureTabSync();
    expect(unregisterBereitschaft).not.toHaveBeenCalled();

    // Nach Reset gilt Bereitschaft wieder als "nicht gemountet" -> erneutes Aktivieren registriert erneut.
    await syncFeatureTabs(['bereitschaft']);
    expect(registerBereitschaft).toHaveBeenCalledTimes(2);
  });

  it('ignoriert unbekannte/nicht registrierte Features', async () => {
    featureLifecycleRegistry.clearAll();
    await expect(syncFeatureTabs(['bereitschaft'])).resolves.toBeUndefined();
  });
  it('Feature-Chunk nicht ladbar: Fehler-Snackbar, nicht als gemountet gemerkt, naechster Aufruf versucht es erneut', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    featureLifecycleRegistry.clearAll();
    featureRegistry.clear();
    const mount = vi.fn();
    const loadUi = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: { mount, unmount: vi.fn() } });
    featureRegistry.define({ meta: berMeta, parts: { ui: loadUi } });

    await expect(syncFeatureTabs(['bereitschaft'])).resolves.toBeUndefined();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(mount).not.toHaveBeenCalled();

    await syncFeatureTabs(['bereitschaft']);
    expect(mount).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
