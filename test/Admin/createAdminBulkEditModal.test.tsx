import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render, setzeWert } from '../reactRender';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { AdminUserRow, BulkApplyResult, BulkUserProfileUpdatePayload } from '@/features/Admin/utils/api';

const { mockBulkUpdateUserProfiles, mockFetchProfileTemplates } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockBulkUpdateUserProfiles: vi.fn(),
  mockFetchProfileTemplates: vi.fn(),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  bulkUpdateUserProfiles: mockBulkUpdateUserProfiles,
  fetchProfileTemplates: mockFetchProfileTemplates,
}));

const { AdminBulkEditModal } = await import('@/features/Admin/components/createAdminBulkEditModal');

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 10));
}

function makeUser(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
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
    canEditVorgabenGeld: false,
    canEditProfileTemplates: false,
    canEditOwnTeamTemplatesOnly: false,
    canCreateFormularVorlagen: false,
    canEditFormularVorlagen: false,
    ...overrides,
  };
}

function renderModal(selectedUsers: AdminUserRow[]): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<AdminBulkEditModal selectedUsers={selectedUsers} onApplied={() => {}} closeModal={() => {}} />, container);
  return container;
}

function emptyResult(): BulkApplyResult {
  return { results: [], summary: { total: 0, ok: 0, skipped: 0, errors: 0 } };
}

describe('AdminBulkEditModal', () => {
  beforeEach(() => {
    mockBulkUpdateUserProfiles.mockReset();
    mockFetchProfileTemplates.mockReset();
    mockFetchProfileTemplates.mockResolvedValue([]);
  });

  it('zeigt alle ausgewählten Benutzer in der Übersicht', () => {
    const users = [makeUser(), makeUser({ _id: 'u2', userName: 'user2', fullName: 'User Zwei', oe: ['V', 'N'] })];
    const container = renderModal(users);

    expect(container.textContent).toContain('Ausgewählte Benutzer (2)');
    expect(container.textContent).toContain('User Eins');
    expect(container.textContent).toContain('User Zwei');
  });

  it('zeigt die Ersetzen-Boxen erst mit angehaktem Ziel, leer und mit dem gemeinsamen Wert als Platzhalter', async () => {
    const users = [makeUser({ oe: ['V', 'IW', 'MI'] }), makeUser({ _id: 'u2', oe: ['V', 'IW', 'N'] })];
    const container = renderModal(users);

    expect(container.querySelector('input[aria-label="Ebene 1 ersetzen"]')).toBeNull();

    container.querySelector<HTMLInputElement>('#bulkOeTarget-pers')!.click();
    await flush();

    const levelInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[aria-label^="Ebene "][aria-label$=" ersetzen"]'),
    );
    expect(levelInputs.map(input => input.value)).toEqual(['', '', '']);
    expect(levelInputs.map(input => input.placeholder)).toEqual(['V', 'IW', '']);
  });

  it('hebt nur die Ebenen hervor, in die tatsächlich etwas eingetippt wurde', async () => {
    const container = renderModal([makeUser({ oe: ['V', 'IW', 'MI'] })]);
    container.querySelector<HTMLInputElement>('#bulkOeTarget-pers')!.click();
    await flush();

    const secondLevelInput = container.querySelector<HTMLInputElement>('input[aria-label="Ebene 2 ersetzen"]')!;
    setzeWert(secondLevelInput, 'NEU');
    await flush();

    const highlighted = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[aria-label$=" ersetzen"].border-warning'),
    );
    expect(highlighted.map(input => input.getAttribute('aria-label'))).toEqual(['Ebene 2 ersetzen']);
  });

  it('sendet ohne angehaktes Ziel keine OE-Änderung (kein API-Call)', async () => {
    const container = renderModal([makeUser()]);

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    expect(container.textContent).toContain('Bitte mindestens eine Änderung auswählen');
    expect(mockBulkUpdateUserProfiles).not.toHaveBeenCalled();
  });

  it('entfernt einzelne Benutzer aus der Auswahl', async () => {
    const users = [makeUser(), makeUser({ _id: 'u2', userName: 'user2', fullName: 'User Zwei' })];
    const container = renderModal(users);

    container.querySelector<HTMLButtonElement>('button[aria-label="User Zwei abwählen"]')!.click();
    await flush();

    expect(container.textContent).toContain('Ausgewählte Benutzer (1)');
    expect(container.textContent).not.toContain('User Zwei');
  });

  it('verlangt eine ausgefüllte Ebene, sobald ein Ziel angehakt ist', async () => {
    const container = renderModal([makeUser({ oe: [] })]);

    container.querySelector<HTMLInputElement>('#bulkOeTarget-pers')!.click();
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    expect(container.textContent).toContain('Bitte mindestens eine Ebene zum Ersetzen ausfüllen');
    expect(mockBulkUpdateUserProfiles).not.toHaveBeenCalled();
  });

  it('erlaubt mehrere Ziel-Checkboxen gleichzeitig und sendet sie im Payload', async () => {
    mockBulkUpdateUserProfiles.mockResolvedValue(emptyResult());
    const container = renderModal([makeUser()]);

    container.querySelector<HTMLInputElement>('#bulkOeTarget-pers')!.click();
    container.querySelector<HTMLInputElement>('#bulkOeTarget-teamOes')!.click();
    await flush();

    const firstLevelInput = container.querySelector<HTMLInputElement>('input[aria-label="Ebene 1 ersetzen"]')!;
    setzeWert(firstLevelInput, 'X');
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    expect(mockBulkUpdateUserProfiles).toHaveBeenCalledTimes(1);
    const payload = mockBulkUpdateUserProfiles.mock.calls[0][0] as BulkUserProfileUpdatePayload;
    expect(payload.oeLevelsApplyTo).toEqual(['pers', 'teamOes']);
    expect(payload.oeLevels?.[0]).toBe('X');
  });

  it('sendet ein einfaches Feld nur, wenn seine Checkbox aktiviert ist', async () => {
    mockBulkUpdateUserProfiles.mockResolvedValue(emptyResult());
    const container = renderModal([makeUser()]);

    const gewerkInput = container.querySelector<HTMLInputElement>('input[aria-label="Gewerk"]');
    expect(gewerkInput).toBeNull();

    container.querySelector<HTMLInputElement>('#bulkSimple-gewerk')!.click();
    await flush();

    const gewerkInputAfter = container.querySelector<HTMLInputElement>('input[aria-label="Gewerk"]')!;
    setzeWert(gewerkInputAfter, 'Fahrweg');
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    const payload = mockBulkUpdateUserProfiles.mock.calls[0][0] as BulkUserProfileUpdatePayload;
    expect(payload.gewerk).toBe('Fahrweg');
    expect(payload.betrieb).toBeUndefined();
  });

  it('füllt beim Hinzufügen einer Team-Admin-OE die leeren Ebenen aus der Vorlage', async () => {
    mockBulkUpdateUserProfiles.mockResolvedValue(emptyResult());
    const users = [
      makeUser({ adminForTeamOes: ['V.IW-MI-N'] }),
      makeUser({ _id: 'u2', adminForTeamOes: ['V.IW-MI-KSL'] }),
    ];
    const container = renderModal(users);

    container.querySelector<HTMLInputElement>('#bulkAdminOe-teamOes-add')!.click();
    await flush();

    const levelInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[aria-label^="Team-Admin-OEs: Ebene "]'),
    );
    expect(levelInputs.map(input => input.placeholder)).toEqual(['V', 'IW', 'MI', '']);

    setzeWert(levelInputs[3], 'IL');
    await flush();

    expect(container.textContent).toContain('Wird hinzugefügt: V.IW-MI-IL');

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    const payload = mockBulkUpdateUserProfiles.mock.calls[0][0] as BulkUserProfileUpdatePayload;
    expect(payload.teamOes).toEqual({ add: 'V.IW-MI-IL' });
  });

  it('zeigt im Entfernen-Select nur vorhandene Team-Admin-OE-Pfade der Auswahl', async () => {
    const users = [makeUser({ adminForTeamOes: ['V.IW-MI'] }), makeUser({ _id: 'u2', adminForTeamOes: ['V.IW-N'] })];
    const container = renderModal(users);

    const removeRadio = container.querySelector<HTMLInputElement>('#bulkAdminOe-teamOes-remove')!;
    removeRadio.click();
    await flush();

    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Team-Admin-OEs entfernen"]')!;
    const options = Array.from(select.options)
      .map(opt => opt.value)
      .filter(Boolean);
    expect(options).toEqual(['V.IW-MI', 'V.IW-N']);
  });

  it('zeigt in der Vorschau nur Spalten für tatsächlich aktivierte Felder', async () => {
    mockBulkUpdateUserProfiles.mockResolvedValue({
      results: [
        {
          userId: 'u1',
          userName: 'user1',
          oe: { before: '', after: '', applicable: false },
          betrieb: { before: 'Alt', after: 'Neu' },
          gewerk: { before: '', after: '' },
          ersteTkgSt: { before: '', after: '' },
          ersteTkgStAdresse: { before: '', after: '' },
          teamOes: { before: '', after: '' },
          organizationOes: { before: '', after: '' },
          categoriesApplied: [],
          status: 'ok',
        },
      ],
      summary: { total: 1, ok: 1, skipped: 0, errors: 0 },
    } satisfies BulkApplyResult);
    const container = renderModal([makeUser()]);

    container.querySelector<HTMLInputElement>('#bulkSimple-betrieb')!.click();
    await flush();
    const betriebInput = container.querySelector<HTMLInputElement>('input[aria-label="Betrieb"]')!;
    setzeWert(betriebInput, 'Neu');
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    const headers = Array.from(container.querySelectorAll('table thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Benutzer', 'Betrieb']);
  });

  it('zeigt das Vorlage-Select direkt unter dem Vorlage-Radio, nicht unter Muster-Benutzer', async () => {
    const container = renderModal([makeUser()]);

    const templateRadio = container.querySelector<HTMLInputElement>('#bulkApplySource-template')!;
    templateRadio.click();
    await flush();

    const templateRadioLabel = templateRadio.closest('div')!;
    const select = container.querySelector('select[aria-label="Vorlage"]')!;
    expect(templateRadioLabel.nextElementSibling).toBe(select.parentElement);
    expect(container.querySelector('select[aria-label="Muster-Benutzer"]')).toBeNull();
  });
});
