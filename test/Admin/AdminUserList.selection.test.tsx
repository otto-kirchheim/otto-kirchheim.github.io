import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from 'preact';
import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { AdminUserRow } from '@/features/Admin/utils/api';

const { mockFetchAdminUsers, mockGetUserCookie, mockCreateAdminBulkEditModal } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockFetchAdminUsers: vi.fn(),
  mockGetUserCookie: vi.fn(),
  mockCreateAdminBulkEditModal: vi.fn(),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  fetchAdminUsers: mockFetchAdminUsers,
  updateUserRole: vi.fn(),
  updateUserOe: vi.fn(),
  updateUserScopes: vi.fn(),
  deleteUser: vi.fn(),
  issueVerificationLink: vi.fn(),
  issuePasswordResetLink: vi.fn(),
}));
vi.mock('@/infrastructure/tokenManagement/decodeAccessToken', () => ({
  getUserCookie: mockGetUserCookie,
}));
vi.mock('@/features/Admin/components/createAdminBulkEditModal', () => ({
  default: mockCreateAdminBulkEditModal,
}));
vi.mock('@/features/Admin/components/createAdminUserPasswordModal', () => ({ default: vi.fn() }));
vi.mock('@/features/Admin/components/createAdminUserLinksModal', () => ({ default: vi.fn() }));
vi.mock('@/features/Admin/utils/actAs', () => ({ loadUserDataForAdminSelection: vi.fn() }));
vi.mock('bootstrap/js/dist/tooltip', () => ({
  default: { getOrCreateInstance: vi.fn(() => ({ dispose: vi.fn() })) },
}));

const { AdminUserList } = await import('@/features/Admin/components/AdminUserList');

function makeUser(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    _id: 'u1',
    userName: 'user1',
    email: 'user1@deutschebahn.com',
    emailVerified: true,
    fullName: 'User Eins',
    role: Role.MEMBER,
    oe: ['V', 'IW', 'MI'],
    adminForTeamOes: [],
    adminForOrganizationOes: [],
    canEditVorgabenGeld: false,
    canEditProfileTemplates: false,
    canEditOwnTeamTemplatesOnly: false,
    ...overrides,
  };
}

/** Wartet, bis Preact das Ergebnis des asynchronen Ladens gerendert hat. */
async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 10));
}

async function renderList(isSuperAdmin: boolean): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<AdminUserList isSuperAdmin={isSuperAdmin} />, container);
  await flush();
  return container;
}

function selectionCheckboxes(container: HTMLDivElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"][aria-label*="Massenänderung"]'));
}

describe('AdminUserList Mehrfachauswahl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserCookie.mockReturnValue({ userName: 'admin', role: Role.SUPER_ADMIN });
    mockFetchAdminUsers.mockResolvedValue([
      makeUser(),
      makeUser({ _id: 'u2', userName: 'user2', fullName: 'User Zwei' }),
      makeUser({ _id: 'self', userName: 'admin', fullName: 'Der Admin' }),
    ]);
  });

  it('zeigt keine Auswahl-Checkboxen ohne Super-Admin-Recht', async () => {
    const container = await renderList(false);

    expect(selectionCheckboxes(container)).toHaveLength(0);
    expect(container.querySelector('#adminUserSelectAll')).toBeNull();
  });

  it('bietet die eigene Zeile nicht zur Auswahl an', async () => {
    const container = await renderList(true);

    const labels = selectionCheckboxes(container).map(input => input.getAttribute('aria-label'));
    expect(labels).toHaveLength(2);
    expect(labels.some(label => label?.includes('admin '))).toBe(false);
  });

  it('blendet die Aktionsleiste erst bei getroffener Auswahl ein', async () => {
    const container = await renderList(true);
    expect(container.textContent).not.toContain('Massenänderung');

    selectionCheckboxes(container)[0].click();
    await flush();

    expect(container.textContent).toContain('1 ausgewählt');
    expect(container.textContent).toContain('Massenänderung');
  });

  it('übergibt die ausgewählten Benutzer an den Massenänderungs-Dialog', async () => {
    const container = await renderList(true);

    selectionCheckboxes(container)[0].click();
    await flush();

    const button = Array.from(container.querySelectorAll('button')).find(entry =>
      entry.textContent?.includes('Massenänderung'),
    );
    button!.click();

    expect(mockCreateAdminBulkEditModal).toHaveBeenCalledTimes(1);
    const [selected] = mockCreateAdminBulkEditModal.mock.calls[0];
    expect(selected).toHaveLength(1);
    expect(selected[0]._id).toBe('u1');
  });

  it('verwirft die Auswahl beim Wechsel des OE-Filters', async () => {
    const container = await renderList(true);

    selectionCheckboxes(container)[0].click();
    await flush();
    expect(container.textContent).toContain('1 ausgewählt');

    const oeInput = container.querySelector<HTMLInputElement>('#filterOe') ?? container.querySelector('input')!;
    oeInput.value = 'V';
    oeInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(container.textContent).not.toContain('1 ausgewählt');
  });
});
