import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';
import { render } from '@test/reactRender';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { AdminUserRow } from '@/pages/admin/api/api';
import type { UserEditState } from '@/pages/admin/ui/adminUserListTypen';

const { mockCreateScopeModal } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  mockCreateScopeModal: vi.fn(),
}));

vi.mock('@/pages/admin/ui/createAdminUserScopeModal', () => ({ default: mockCreateScopeModal }));

const { AdminUserCard } = await import('@/pages/admin/ui/AdminUserCard');

function machUser(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    _id: 'u1',
    userName: 'user1',
    email: 'user1@deutschebahn.com',
    emailVerified: true,
    fullName: 'User Eins',
    role: Role.MEMBER,
    oe: ['V', 'IW', 'MI'],
    betrieb: 'DB Test AG',
    adminForTeamOes: [],
    adminForOrganizationOes: [],
    adminForStuetzpunkte: [],
    canEditVorgabenGeld: false,
    canEditProfileTemplates: false,
    canEditOwnTeamTemplatesOnly: false,
    canCreateFormularVorlagen: false,
    canEditFormularVorlagen: false,
    ...overrides,
  };
}

function machEdit(overrides: Partial<UserEditState> = {}): UserEditState {
  return {
    oe: 'V.IW-MI',
    role: Role.MEMBER,
    adminForTeamOes: [],
    adminForOrganizationOes: [],
    adminForStuetzpunkte: [],
    canEditVorgabenGeld: false,
    canEditProfileTemplates: false,
    canEditOwnTeamTemplatesOnly: false,
    canCreateFormularVorlagen: false,
    canEditFormularVorlagen: false,
    ...overrides,
  };
}

function zeichne(
  userOverrides: Partial<AdminUserRow> = {},
  editOverrides: Partial<UserEditState> = {},
  flags: { editable?: boolean } = {},
) {
  const currentUser = machUser(userOverrides);
  const edit = machEdit({ role: currentUser.role, ...editOverrides });
  const updateEdit = mock((_patch: Partial<UserEditState>) => {});
  const container = document.createElement('div');
  document.body.append(container);
  render(
    <AdminUserCard
      currentUser={currentUser}
      edit={edit}
      isSuperAdmin={true}
      isSelfRow={false}
      isSaving={false}
      isExpanded={true}
      isSelected={false}
      changed={false}
      editable={flags.editable ?? true}
      roleEditable={true}
      permissionEditable={true}
      onToggleExpand={() => {}}
      onToggleSelection={() => {}}
      updateEdit={updateEdit}
      onSave={() => {}}
      onResetEdit={() => {}}
      onLoadAsUser={() => {}}
      onDelete={() => {}}
    />,
    container,
  );
  return { container, updateEdit };
}

function checkboxMitBeschriftung(wurzel: ParentNode, beschriftung: string): HTMLInputElement | null {
  const treffer = [...wurzel.querySelectorAll('.db-checkbox label')].find(l => l.textContent?.trim() === beschriftung);
  return treffer?.querySelector<HTMLInputElement>('input') ?? null;
}

describe('AdminUserCard – Staffelung nach Rolle', () => {
  it('Mitglied: keine Team-/Org-/Stützpunkt- oder Berechtigungs-Blöcke', () => {
    const { container } = zeichne({ role: Role.MEMBER }, { role: Role.MEMBER });

    expect(container.textContent).not.toContain('Team-Admin OEs');
    expect(container.textContent).not.toContain('Team-Admin Stützpunkte');
    expect(container.textContent).not.toContain('Org-Admin OEs');
    expect(container.textContent).not.toContain('Spezielle Admin-Berechtigungen');
  });

  it('Team-Admin: Team-OE + Stützpunkt + Berechtigungen, aber kein Org-OE', () => {
    const { container } = zeichne({ role: Role.TEAM_ADMIN }, { role: Role.TEAM_ADMIN });

    expect(container.textContent).toContain('Team-Admin OEs');
    expect(container.textContent).toContain('Team-Admin Stützpunkte');
    expect(container.textContent).toContain('Spezielle Admin-Berechtigungen');
    expect(container.textContent).not.toContain('Org-Admin OEs');
  });

  it('Org-Admin: Team-OE + Stützpunkt + Org-OE + Berechtigungen gemeinsam', () => {
    const { container } = zeichne({ role: Role.ORG_ADMIN }, { role: Role.ORG_ADMIN });

    expect(container.textContent).toContain('Team-Admin OEs');
    expect(container.textContent).toContain('Team-Admin Stützpunkte');
    expect(container.textContent).toContain('Org-Admin OEs');
    expect(container.textContent).toContain('Spezielle Admin-Berechtigungen');
  });

  it('Super-Admin: keine extra Blöcke, da Flags/Scopes serverseitig ohnehin umgangen werden', () => {
    const { container } = zeichne({ role: Role.SUPER_ADMIN }, { role: Role.SUPER_ADMIN });

    expect(container.textContent).not.toContain('Team-Admin OEs');
    expect(container.textContent).not.toContain('Team-Admin Stützpunkte');
    expect(container.textContent).not.toContain('Org-Admin OEs');
    expect(container.textContent).not.toContain('Spezielle Admin-Berechtigungen');
  });

  it('reagiert auf die gerade im Dropdown gewählte (noch ungespeicherte) Rolle, nicht die gespeicherte', () => {
    const { container } = zeichne({ role: Role.MEMBER }, { role: Role.TEAM_ADMIN });

    expect(container.textContent).toContain('Team-Admin OEs');
  });
});

describe('AdminUserCard – Bearbeiten-Dialog und Löschen per Tag', () => {
  beforeEach(() => mockCreateScopeModal.mockClear());

  it('"Bearbeiten" öffnet den Dialog mit dem aktuellen Bearbeitungsstand und reicht updateEdit als Übernehmen durch', () => {
    const { container, updateEdit } = zeichne(
      { role: Role.TEAM_ADMIN, fullName: 'Max Muster' },
      { role: Role.TEAM_ADMIN, oe: 'V.IW-MI', adminForTeamOes: ['V.IW-MI'], adminForStuetzpunkte: ['Kirchheim'] },
    );

    const knopf = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Bearbeiten'));
    expect(knopf).toBeDefined();
    knopf!.click();

    expect(mockCreateScopeModal).toHaveBeenCalledTimes(1);
    const [titel, start, roleEditable, onApply] = mockCreateScopeModal.mock.calls[0];
    expect(titel).toBe('Max Muster');
    expect(start).toEqual({
      role: Role.TEAM_ADMIN,
      oe: 'V.IW-MI',
      adminForTeamOes: ['V.IW-MI'],
      adminForStuetzpunkte: ['Kirchheim'],
      adminForOrganizationOes: [],
    });
    expect(roleEditable).toBe(true);
    expect(onApply).toBe(updateEdit);
  });

  it('zeigt Rolle und OE nur noch als Text, ohne Eingabefelder', () => {
    const { container } = zeichne({ role: Role.TEAM_ADMIN }, { role: Role.TEAM_ADMIN, oe: 'V.IW-MI' });

    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('.db-input')).toBeNull();
    expect(container.textContent).toContain('V.IW-MI');
  });

  it('× an einem Stützpunkt-Tag entfernt ihn direkt aus dem Bearbeitungsstand', () => {
    const { container, updateEdit } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, adminForStuetzpunkte: ['Kirchheim', 'Plochingen'] },
    );

    const entfernen = [...container.querySelectorAll('button')].find(b =>
      b.textContent?.includes('Kirchheim entfernen'),
    );
    expect(entfernen).toBeDefined();
    entfernen!.click();

    expect(updateEdit).toHaveBeenCalledWith({ adminForStuetzpunkte: ['Plochingen'] });
  });

  it('ohne Bearbeitungsrecht kein "Bearbeiten"-Knopf', () => {
    const { container } = zeichne({ role: Role.TEAM_ADMIN }, { role: Role.TEAM_ADMIN }, { editable: false });

    expect([...container.querySelectorAll('button')].some(b => b.textContent?.includes('Bearbeiten'))).toBe(false);
  });
});

describe('AdminUserCard – Staffelung der Berechtigungs-Checkboxen', () => {
  it('Org-Admin: "nur im eigenen OE-Scope" erst sichtbar, wenn "Profile-Templates bearbeiten" an ist', () => {
    const { container: ohne } = zeichne({ role: Role.ORG_ADMIN }, { role: Role.ORG_ADMIN, canEditProfileTemplates: false });
    expect(ohne.textContent).not.toContain('Profile-Templates nur im eigenen OE-Scope');

    const { container: mit } = zeichne({ role: Role.ORG_ADMIN }, { role: Role.ORG_ADMIN, canEditProfileTemplates: true });
    expect(mit.textContent).toContain('Profile-Templates nur im eigenen OE-Scope');
  });

  it('Team-Admin: statt Checkbox ein Hinweis, dass Vorlagen immer auf den eigenen Scope begrenzt sind', () => {
    const { container } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, canEditProfileTemplates: true },
    );
    expect(container.textContent).not.toContain('Profile-Templates nur im eigenen OE-Scope');
    expect(container.textContent).toContain('Team-Admin bearbeitet nur Vorlagen der eigenen Team-OE');
  });

  it('Abwählen von "Profile-Templates bearbeiten" setzt canEditOwnTeamTemplatesOnly mit zurück', () => {
    const { container, updateEdit } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, canEditProfileTemplates: true, canEditOwnTeamTemplatesOnly: true },
    );

    const checkbox = checkboxMitBeschriftung(container, 'Darf Profile-Templates bearbeiten');
    expect(checkbox).not.toBeNull();
    checkbox!.click();

    expect(updateEdit).toHaveBeenCalledWith({ canEditProfileTemplates: false, canEditOwnTeamTemplatesOnly: false });
  });

  it('"Formular-Vorlagen erstellen" erst sichtbar, wenn "Formular-Vorlagen bearbeiten" an ist', () => {
    const { container: ohne } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, canEditFormularVorlagen: false },
    );
    expect(ohne.textContent).not.toContain('Darf Formular-Vorlagen erstellen');

    const { container: mit } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, canEditFormularVorlagen: true },
    );
    expect(mit.textContent).toContain('Darf Formular-Vorlagen erstellen');
  });

  it('Abwählen von "Formular-Vorlagen bearbeiten" setzt canCreateFormularVorlagen mit zurück', () => {
    const { container, updateEdit } = zeichne(
      { role: Role.TEAM_ADMIN },
      { role: Role.TEAM_ADMIN, canEditFormularVorlagen: true, canCreateFormularVorlagen: true },
    );

    const checkbox = checkboxMitBeschriftung(container, 'Darf Formular-Vorlagen bearbeiten');
    expect(checkbox).not.toBeNull();
    checkbox!.click();

    expect(updateEdit).toHaveBeenCalledWith({ canEditFormularVorlagen: false, canCreateFormularVorlagen: false });
  });
});
