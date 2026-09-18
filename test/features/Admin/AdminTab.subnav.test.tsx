import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { Role } from '@otto-kirchheim/nebengeld-shared';
import { render } from '../../reactRender';
import { setAktivenAdminTab } from '@/infrastructure/ui/activeAdminTabStore';
import { zeigeTab } from '@/infrastructure/ui/tabController';

/**
 * `AdminTab`s Unternavigation (Teil 3 der "mehr echtes React"-Initiative): `zeigeTab()`
 * schreibt in `activeAdminTabStore`, die Komponente liest reaktiv per `useActiveAdminTab()`.
 * Deckt insbesondere den vormaligen Nebenbug ab: ein Re-Render aus anderem Grund (hier via
 * `capabilities`-Prop-Wechsel simuliert) darf den zuvor gewaehlten Unter-Tab NICHT auf den
 * hartkodierten Default zuruecksetzen.
 */

const { mockFetchCurrentAdminCapabilities, mockGetActAsState } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockFetchCurrentAdminCapabilities: vi.fn(),
  mockGetActAsState: vi.fn(() => ({ active: false })),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  fetchCurrentAdminCapabilities: mockFetchCurrentAdminCapabilities,
}));
vi.mock('@/infrastructure/ui/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatusChanged',
  getActAsState: mockGetActAsState,
}));

// AdminTab bindet zahlreiche schwergewichtige Kind-Komponenten ein -- fuer diesen Test zaehlt
// nur die Unternavigation/Pane-Umschaltung selbst, die Kinder werden auf einen Marker reduziert.
vi.mock('@/features/Admin/components/AdminUserList', () => ({ AdminUserList: () => 'AdminUserList' }));
vi.mock('@/features/Admin/components/AdminVorgabenEditor', () => ({
  AdminVorgabenEditor: () => 'AdminVorgabenEditor',
}));
vi.mock('@/features/Admin/components/AdminProfileTemplatesManager', () => ({
  AdminProfileTemplatesManager: () => 'AdminProfileTemplatesManager',
}));
vi.mock('@/features/Admin/components/AdminDashboard', () => ({ AdminDashboard: () => 'AdminDashboard' }));
vi.mock('@/features/Admin/components/AdminResourceBrowser', () => ({
  AdminResourceBrowser: () => 'AdminResourceBrowser',
}));
vi.mock('@/features/Admin/components/AdminUserProfileEditor', () => ({
  AdminUserProfileEditor: () => 'AdminUserProfileEditor',
}));
vi.mock('@/features/Admin/components/AdminLogBrowser', () => ({ AdminLogBrowser: () => 'AdminLogBrowser' }));
vi.mock('@/features/Admin/components/FormularUpload', () => ({ FormularUpload: () => 'FormularUpload' }));

import AdminTab from '@/features/Admin';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  setAktivenAdminTab('admin-pane-dashboard');
  mockFetchCurrentAdminCapabilities.mockResolvedValue({
    role: Role.SUPER_ADMIN,
    canEditVorgabenGeld: true,
    canEditProfileTemplates: true,
    canEditOwnTeamTemplatesOnly: false,
    canCreateFormularVorlagen: true,
    canEditFormularVorlagen: true,
  });
});

afterEach(() => {
  render(null, container);
  container.remove();
  vi.clearAllMocks();
});

describe('AdminTab Unternavigation', () => {
  it('schaltet data-active/aria-selected und Pane-Klassen reaktiv ueber zeigeTab()', async () => {
    render(<AdminTab />, container);
    await flush();

    expect(container.querySelector('#admin-tab-dashboard')?.closest('li')?.dataset.active).toBe('true');
    expect(container.querySelector('#admin-pane-dashboard')?.className).toContain('show active');
    expect(container.querySelector('#admin-pane-resources')?.className).not.toContain('show active');

    zeigeTab('admin-pane-resources');
    await flush();

    expect(container.querySelector('#admin-tab-dashboard')?.getAttribute('aria-selected')).toBe('false');
    expect(container.querySelector('#admin-tab-resources')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#admin-tab-resources')?.closest('li')?.dataset.active).toBe('true');
    expect(container.querySelector('#admin-pane-dashboard')?.className).not.toContain('show active');
    expect(container.querySelector('#admin-pane-resources')?.className).toContain('show active');
  });

  it('behaelt den gewaehlten Unter-Tab nach einem fremden Re-Render (Nebenbug-Regression)', async () => {
    render(<AdminTab />, container);
    await flush();

    zeigeTab('admin-pane-profiles');
    await flush();
    expect(container.querySelector('#admin-pane-profiles')?.className).toContain('show active');

    // Re-Render aus anderem Grund (hier: Act-as-Status-Event, wie `AdminTab`s eigener Effekt es
    // abonniert) -- vorher berechnete `aktiverUnterTab` in diesem Fall wieder den hartkodierten
    // Default ('dashboard') und ueberschrieb damit die zuvor per DOM gesetzte Pane-Sichtbarkeit.
    mockGetActAsState.mockReturnValue({ active: true });
    window.dispatchEvent(new Event('actAsStatusChanged'));
    await flush();

    expect(container.querySelector('#admin-pane-profiles')?.className).toContain('show active');
    expect(container.querySelector('#admin-pane-dashboard')?.className).not.toContain('show active');
    expect(container.querySelector('#admin-tab-profiles')?.closest('li')?.dataset.active).toBe('true');
  });
});
