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

vi.mock('@/infrastructure/ui/reactRoot', () => ({ mount: mockMount, unmount: mockUnmount }));
vi.mock('@/features/Admin/utils/api', () => ({
  fetchCurrentAdminCapabilities: mockFetchCurrentAdminCapabilities,
}));
vi.mock('@/infrastructure/ui/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatusChanged',
  getActAsState: mockGetActAsState,
}));

vi.mock('@/infrastructure/api/FetchRetry', () => ({
  getServerUrl: mockGetServerUrl,
}));

import { mountAdminTab, unmountAdminTab } from '@/features/Admin';
import { featureLifecycleRegistry } from '@/core/hooks';
import type { FeatureContext } from '@/core/hooks';

afterEach(() => {
  featureLifecycleRegistry.clearAll();
  vi.clearAllMocks();
});

describe('Admin feature lifecycle registration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="admin" class="d-none"></div>
      <div id="Admin" class="d-none"></div>
      <div id="admin-root"></div>
    `;
  });

  it('mountAdminTab shows admin nav elements and renders', () => {
    document.querySelector('#admin')?.classList.remove('d-none');
    document.querySelector('#Admin')?.classList.remove('d-none');
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
          document.querySelector<HTMLDivElement>('#admin')?.classList.remove('d-none');
          document.querySelector<HTMLDivElement>('#Admin')?.classList.remove('d-none');
          mountAdminTab(ctx.userName);
        }
      },
      async unregister(): Promise<void> {
        unmountAdminTab();
      },
    });

    await featureLifecycleRegistry.initializeAll({ isAdmin: true, userName: 'AdminUser' });
    expect(document.querySelector('#admin')?.classList.contains('d-none')).toBe(false);
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
    expect(document.querySelector('#admin')?.classList.contains('d-none')).toBe(true);
    expect(mockMount).not.toHaveBeenCalled();
  });
});
