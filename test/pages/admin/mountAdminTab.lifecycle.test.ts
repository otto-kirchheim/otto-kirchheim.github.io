import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

// --- Hoisted mocks ---
const { mockMount, mockUnmount, mockFetchCurrentAdminCapabilities, mockGetActAsState, mockGetServerUrl } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockMount: vi.fn(),
  mockUnmount: vi.fn(),
  mockFetchCurrentAdminCapabilities: vi.fn(),
  mockGetActAsState: vi.fn(() => ({ active: false })),
  mockGetServerUrl: vi.fn(async () => 'https://example.com/api/v2'),
}));

vi.mock('@/shared/lib/react-root/reactRoot', () => ({ mount: mockMount, unmount: mockUnmount }));
vi.mock('@/pages/admin/api/api', () => ({
  fetchCurrentAdminCapabilities: mockFetchCurrentAdminCapabilities,
}));
vi.mock('@/shared/model/session/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatusChanged',
  getActAsState: mockGetActAsState,
}));

vi.mock('@/shared/api/FetchRetry', () => ({
  getServerUrl: mockGetServerUrl,
}));

import { mountAdminTab, unmountAdminTab } from '@/pages/admin/mountAdminTab';
import { featureLifecycleRegistry } from '@/shared/lib/feature';
import type { FeatureContext } from '@/shared/lib/feature';

afterEach(() => {
  featureLifecycleRegistry.clearAll();
  vi.clearAllMocks();
});

describe('Admin feature lifecycle registration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="admin" hidden></div>
      <div id="Admin" role="tabpanel" data-gesperrt></div>
      <div id="admin-root"></div>
    `;
  });

  it('mountAdminTab shows admin nav elements and renders', () => {
    document.querySelector<HTMLElement>('#admin')!.hidden = false;
    document.querySelector('#Admin')?.removeAttribute('data-gesperrt');
    mountAdminTab('AdminUser');

    expect(mockMount).toHaveBeenCalled();
  });

  it('unmountAdminTab haengt den Admin-Root ab', () => {
    unmountAdminTab();

    expect(mockUnmount).toHaveBeenCalledWith(expect.anything());
  });

  it('featureLifecycleRegistry handles Admin register/unregister cycle', async () => {
    featureLifecycleRegistry.registerFeature({
      name: 'Admin',
      async register(ctx: FeatureContext): Promise<void> {
        if (ctx.isAdmin) {
          document.querySelectorAll<HTMLDivElement>('#admin').forEach(el => (el.hidden = false));
          document.querySelector<HTMLDivElement>('#Admin')?.removeAttribute('data-gesperrt');
          mountAdminTab(ctx.userName);
        }
      },
      async unregister(): Promise<void> {
        unmountAdminTab();
      },
    });

    await featureLifecycleRegistry.initializeAll({ isAdmin: true, userName: 'AdminUser' });
    expect(document.querySelector<HTMLElement>('#admin')?.hidden).toBe(false);
    expect(mockMount).toHaveBeenCalled();

    mockUnmount.mockClear();
    await featureLifecycleRegistry.teardownAll();
    expect(mockUnmount).toHaveBeenCalledWith(expect.anything());
  });

  it('register does not mount when isAdmin=false', async () => {
    featureLifecycleRegistry.registerFeature({
      name: 'Admin',
      async register(ctx: FeatureContext): Promise<void> {
        if (ctx.isAdmin) {
          mountAdminTab(ctx.userName);
        }
      },
    });

    await featureLifecycleRegistry.initializeAll({ isAdmin: false, userName: 'RegularUser' });
    expect(document.querySelector<HTMLElement>('#admin')?.hidden).toBe(true);
    expect(mockMount).not.toHaveBeenCalled();
  });
});
