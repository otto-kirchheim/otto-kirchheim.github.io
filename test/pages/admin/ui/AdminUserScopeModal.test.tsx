import { describe, expect, it, mock } from 'bun:test';
import { feldMitBeschriftung, render, setzeWert } from '@test/reactRender';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import { AdminUserScopeModal, type ScopeEntwurf } from '@/pages/admin/ui/AdminUserScopeModal';

function machStart(overrides: Partial<ScopeEntwurf> = {}): ScopeEntwurf {
  return {
    role: Role.TEAM_ADMIN,
    oe: 'V.IW-MI',
    adminForTeamOes: ['V.IW-MI'],
    adminForStuetzpunkte: [],
    adminForOrganizationOes: [],
    ...overrides,
  };
}

function zeichne(start: ScopeEntwurf = machStart(), roleEditable = true) {
  const onApply = mock((_entwurf: ScopeEntwurf) => {});
  const closeModal = mock(() => {});
  const container = document.createElement('div');
  document.body.append(container);
  render(
    <AdminUserScopeModal
      userName="Max Muster"
      start={start}
      roleEditable={roleEditable}
      onApply={onApply}
      closeModal={closeModal}
    />,
    container,
  );
  return { container, onApply, closeModal };
}

function knopfMitText(wurzel: ParentNode, text: string): HTMLButtonElement {
  const knopf = [...wurzel.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  if (!knopf) throw new Error(`Knopf "${text}" nicht gefunden`);
  return knopf;
}

describe('AdminUserScopeModal', () => {
  it('zeigt die Blöcke passend zur im Dialog gewählten Rolle und reagiert live auf den Wechsel', () => {
    const { container } = zeichne(machStart({ role: Role.TEAM_ADMIN }));

    expect(container.textContent).toContain('Team-Admin OEs');
    expect(container.textContent).not.toContain('Org-Admin OEs');

    const rolle = feldMitBeschriftung<HTMLSelectElement>(container, 'Rolle');
    expect(rolle).not.toBeNull();
    setzeWert(rolle!, Role.ORG_ADMIN);
    rolle!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(container.textContent).toContain('Org-Admin OEs');

    setzeWert(rolle!, Role.MEMBER);
    rolle!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(container.textContent).not.toContain('Team-Admin OEs');
    expect(container.textContent).not.toContain('Org-Admin OEs');
  });

  it('"Übernehmen" reicht den Entwurf weiter und schließt den Dialog', () => {
    const { container, onApply, closeModal } = zeichne(machStart({ role: Role.TEAM_ADMIN }));

    const rolle = feldMitBeschriftung<HTMLSelectElement>(container, 'Rolle');
    setzeWert(rolle!, Role.ORG_ADMIN);
    rolle!.dispatchEvent(new Event('change', { bubbles: true }));

    knopfMitText(container, 'Übernehmen').click();

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toEqual(machStart({ role: Role.ORG_ADMIN }));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('ohne Übernehmen wird nichts weitergereicht', () => {
    const { onApply } = zeichne();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('Rolle ist gesperrt, wenn sie nicht geändert werden darf', () => {
    const { container } = zeichne(machStart(), false);
    expect(feldMitBeschriftung<HTMLSelectElement>(container, 'Rolle')?.disabled).toBe(true);
  });
});
