import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { feldMitBeschriftung, felderMitBeschriftung, render, setzeWert } from '../reactRender';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { AdminUserRow, BulkApplyResult, BulkUserProfileUpdatePayload } from '@/features/Admin/utils/api';

/**
 * Seit der Umstellung auf `DBCheckbox`/`DBButton` (J3) vergibt DB die `id` erst per `useEffect`
 * (`checkbox-${useId()}` als Fallback) -- direkt nach `render()` ist sie noch nicht gesetzt.
 * `feldMitBeschriftung` (Label-Text statt `id`) ist robust dagegen; fuer Checkboxen ausserhalb
 * eines Formular-Kontexts reicht die Suche ueber `.db-checkbox label`.
 */
function checkboxMitBeschriftung(wurzel: ParentNode, beschriftung: string): HTMLInputElement {
  const treffer = [...wurzel.querySelectorAll('.db-checkbox label, .db-radio label')].find(
    l => l.textContent?.trim() === beschriftung,
  );
  const input = treffer?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error(`Checkbox/Radio "${beschriftung}" nicht gefunden`);
  return input;
}

function knopfMitText(wurzel: ParentNode, text: string): HTMLButtonElement {
  const knopf = [...wurzel.querySelectorAll('button')].find(b => b.textContent?.includes(text));
  if (!knopf) throw new Error(`Knopf mit Text "${text}" nicht gefunden`);
  return knopf;
}

/**
 * `BulkEditAdminOesBlock` rendert zweimal (teamOes/organizationOes) mit denselben Label-Texten
 * ("Hinzufügen"/"Entfernen") -- `name` (statisch, nicht per `useId` erzeugt) grenzt auf den
 * richtigen Block ein, `beschriftung` waehlt darin die Option.
 */
function radioMitNameUndBeschriftung(wurzel: ParentNode, name: string, beschriftung: string): HTMLInputElement {
  const treffer = [...wurzel.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)].find(
    radio => radio.closest('label')?.textContent?.trim() === beschriftung,
  );
  if (!treffer) throw new Error(`Radio name="${name}" mit Beschriftung "${beschriftung}" nicht gefunden`);
  return treffer;
}

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

const { AdminBulkEditModal } = await import('@/features/Admin/components/AdminBulkEditModal');

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

    expect(feldMitBeschriftung(container, 'Ebene 1 ersetzen')).toBeNull();

    checkboxMitBeschriftung(container, 'Pers.OE').click();
    await flush();

    const levelInputs = felderMitBeschriftung<HTMLInputElement>(container, /^Ebene .* ersetzen$/);
    expect(levelInputs.map(input => input.value)).toEqual(['', '', '']);
    expect(levelInputs.map(input => input.placeholder)).toEqual(['V', 'IW', '']);
  });

  it('hebt nur die Ebenen hervor, in die tatsächlich etwas eingetippt wurde', async () => {
    const container = renderModal([makeUser({ oe: ['V', 'IW', 'MI'] })]);
    checkboxMitBeschriftung(container, 'Pers.OE').click();
    await flush();

    const secondLevelInput = feldMitBeschriftung<HTMLInputElement>(container, 'Ebene 2 ersetzen')!;
    setzeWert(secondLevelInput, 'NEU');
    await flush();

    const highlighted = felderMitBeschriftung<HTMLInputElement>(container, / ersetzen$/).filter(input =>
      input.classList.contains('border-warning'),
    );
    expect(highlighted.map(input => input.closest('.db-input')?.querySelector('label')?.textContent)).toEqual([
      'Ebene 2 ersetzen',
    ]);
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

    knopfMitText(container, 'User Zwei abwählen').click();
    await flush();

    expect(container.textContent).toContain('Ausgewählte Benutzer (1)');
    expect(container.textContent).not.toContain('User Zwei');
  });

  it('verlangt eine ausgefüllte Ebene, sobald ein Ziel angehakt ist', async () => {
    const container = renderModal([makeUser({ oe: [] })]);

    checkboxMitBeschriftung(container, 'Pers.OE').click();
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    expect(container.textContent).toContain('Bitte mindestens eine Ebene zum Ersetzen ausfüllen');
    expect(mockBulkUpdateUserProfiles).not.toHaveBeenCalled();
  });

  it('erlaubt mehrere Ziel-Checkboxen gleichzeitig und sendet sie im Payload', async () => {
    mockBulkUpdateUserProfiles.mockResolvedValue(emptyResult());
    const container = renderModal([makeUser()]);

    checkboxMitBeschriftung(container, 'Pers.OE').click();
    checkboxMitBeschriftung(container, 'Team-Admin-OEs').click();
    await flush();

    const firstLevelInput = feldMitBeschriftung<HTMLInputElement>(container, 'Ebene 1 ersetzen')!;
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

    const gewerkInput = feldMitBeschriftung<HTMLInputElement>(container, 'Neuer Wert für Gewerk');
    expect(gewerkInput).toBeNull();

    checkboxMitBeschriftung(container, 'Gewerk').click();
    await flush();

    const gewerkInputAfter = feldMitBeschriftung<HTMLInputElement>(container, 'Neuer Wert für Gewerk')!;
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

    radioMitNameUndBeschriftung(container, 'bulkAdminOe-teamOes', 'Hinzufügen').click();
    await flush();

    const levelInputs = felderMitBeschriftung<HTMLInputElement>(container, /^Team-Admin-OEs: Ebene /);
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

    const removeRadio = radioMitNameUndBeschriftung(container, 'bulkAdminOe-teamOes', 'Entfernen');
    removeRadio.click();
    await flush();

    const select = feldMitBeschriftung<HTMLSelectElement>(container, 'Team-Admin-OEs entfernen')!;
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

    checkboxMitBeschriftung(container, 'Betrieb').click();
    await flush();
    const betriebInput = feldMitBeschriftung<HTMLInputElement>(container, 'Neuer Wert für Betrieb')!;
    setzeWert(betriebInput, 'Neu');
    await flush();

    container.querySelector<HTMLButtonElement>('button[data-variant="brand"]')!.click();
    await flush();

    const headers = Array.from(container.querySelectorAll('table thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Benutzer', 'Betrieb']);
  });

  it('zeigt das Vorlage-Select direkt unter dem Vorlage-Radio, nicht unter Muster-Benutzer', async () => {
    const container = renderModal([makeUser()]);

    const templateRadio = radioMitNameUndBeschriftung(container, 'bulkApplySource', 'Vorlage');
    templateRadio.click();
    await flush();

    const templateRadioBox = templateRadio.closest('.db-radio')!;
    const select = feldMitBeschriftung<HTMLSelectElement>(container, 'Vorlage wählen')!;
    expect(templateRadioBox.nextElementSibling).toBe(select.closest('.db-select')!.parentElement);
    expect(feldMitBeschriftung(container, 'Muster-Benutzer wählen')).toBeNull();
  });
});
