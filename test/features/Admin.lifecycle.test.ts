import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

// --- Hoisted mocks ---
const { mockRender, mockFetchCurrentAdminCapabilities, mockGetActAsState, mockGetServerUrl } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockRender: vi.fn(),
  mockFetchCurrentAdminCapabilities: vi.fn(),
  mockGetActAsState: vi.fn(() => ({ active: false })),
  mockGetServerUrl: vi.fn(async () => 'https://example.com/api/v2'),
}));

vi.mock('preact', () => ({ render: mockRender, h: vi.fn(() => null) }));
vi.mock('preact/hooks', () => ({ useState: vi.fn((v: unknown) => [v, vi.fn()]), useEffect: vi.fn() }));
vi.mock('../../../src/ts/features/Admin/utils/api', () => ({
  fetchCurrentAdminCapabilities: mockFetchCurrentAdminCapabilities,
}));
vi.mock('../../src/ts/infrastructure/ui/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatusChanged',
  getActAsState: mockGetActAsState,
}));

vi.mock('../../src/ts/infrastructure/api/FetchRetry', () => ({
  getServerUrl: mockGetServerUrl,
}));

import { mountAdminTab, unmountAdminTab } from '../../src/ts/features/Admin';
import { featureLifecycleRegistry } from '../../src/ts/core/hooks';
import type { FeatureContext } from '../../src/ts/core/hooks';

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

    expect(mockRender).toHaveBeenCalled();
  });

  it('unmountAdminTab calls render(null) to unmount', () => {
    unmountAdminTab();

    expect(mockRender).toHaveBeenCalledWith(null, expect.anything());
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
    expect(mockRender).toHaveBeenCalled();

    mockRender.mockClear();
    await featureLifecycleRegistry.teardownAll();
    expect(mockRender).toHaveBeenCalledWith(null, expect.anything());
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
    expect(mockRender).not.toHaveBeenCalled();
  });
});
