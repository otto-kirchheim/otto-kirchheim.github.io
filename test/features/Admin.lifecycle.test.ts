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
vi.mock('../../../src/ts/utilities', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatusChanged',
  getActAsState: mockGetActAsState,
  getServerUrl: mockGetServerUrl,
}));

import { registerAdminFeature } from '../../src/ts/features/Admin';
import { featureLifecycleRegistry } from '../../src/ts/core/hooks';

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

  it('register() shows admin nav elements and mounts when isAdmin=true', async () => {
    const feature = registerAdminFeature();
    await feature.register({ isAdmin: true, userName: 'AdminUser' });

    expect(document.querySelector('#admin')?.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#Admin')?.classList.contains('d-none')).toBe(false);
    expect(mockRender).toHaveBeenCalled();
  });

  it('register() does not mount or show nav when isAdmin=false', async () => {
    const feature = registerAdminFeature();
    await feature.register({ isAdmin: false, userName: 'RegularUser' });

    expect(document.querySelector('#admin')?.classList.contains('d-none')).toBe(true);
    expect(document.querySelector('#Admin')?.classList.contains('d-none')).toBe(true);
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('unregister() calls render(null) to unmount', async () => {
    const feature = registerAdminFeature();
    await feature.unregister?.();

    expect(mockRender).toHaveBeenCalledWith(null, expect.anything());
  });

  it('featureLifecycleRegistry.teardownAll() triggers unregister', async () => {
    const feature = registerAdminFeature();
    featureLifecycleRegistry.registerFeature(feature);
    mockRender.mockClear();

    await featureLifecycleRegistry.teardownAll();
    expect(mockRender).toHaveBeenCalledWith(null, expect.anything());
  });
});
