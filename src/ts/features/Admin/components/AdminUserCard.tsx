import type { TUserRole } from '@/types';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import type { AdminUserRow } from '../utils/api';
import createAdminUserLinksModal from './createAdminUserLinksModal';
import createAdminUserPasswordModal from './createAdminUserPasswordModal';
import { OeLevelBoxes } from './OeLevelBoxes';
import { OeTagInput } from './OeTagInput';
import { ROLE_LABELS, type UserEditState } from './adminUserListTypen';

type Props = {
  currentUser: AdminUserRow;
  edit: UserEditState;
  isSuperAdmin: boolean;
  isSelfRow: boolean;
  isSaving: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  changed: boolean;
  editable: boolean;
  roleEditable: boolean;
  permissionEditable: boolean;
  onToggleExpand: () => void;
  onToggleSelection: () => void;
  updateEdit: (patch: Partial<UserEditState>) => void;
  onSave: () => void;
  onResetEdit: () => void;
  onLoadAsUser: () => void;
  onDelete: () => void;
};

/** Eine Benutzer-Karte: kompakte Kopfzeile (immer sichtbar) + aufklappbarer Bearbeitungsbereich. */
export function AdminUserCard({
  currentUser,
  edit,
  isSuperAdmin,
  isSelfRow,
  isSaving,
  isExpanded,
  isSelected,
  changed,
  editable,
  roleEditable,
  permissionEditable,
  onToggleExpand,
  onToggleSelection,
  updateEdit,
  onSave,
  onResetEdit,
  onLoadAsUser,
  onDelete,
}: Props) {
  const roleInfo = ROLE_LABELS[currentUser.role];

  return (
    <div class="admin-user-card-col">
      <div class={`card ${isSelfRow ? 'border-primary' : ''} ${changed ? 'border-warning' : ''}`}>
        {/* Card Header */}
        <div
          class="card-header d-flex justify-content-between align-items-center py-2"
          style="cursor: pointer"
          onClick={onToggleExpand}
          data-bs-toggle="tooltip"
          data-bs-title={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
        >
          <div class="d-flex align-items-center gap-2 text-truncate">
            {isSuperAdmin && !isSelfRow && (
              <input
                class="form-check-input mt-0 flex-shrink-0"
                type="checkbox"
                aria-label={`${currentUser.userName} für Massenänderung auswählen`}
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={onToggleSelection}
              />
            )}
            <span class="material-icons-round text-body-secondary" style="font-size: 1.25rem">
              person
            </span>
            <span class="text-truncate">
              <span class="fw-semibold d-block text-truncate">{currentUser.fullName || currentUser.userName}</span>
              {currentUser.fullName && (
                <span class="small text-body-secondary d-block text-truncate">{currentUser.userName}</span>
              )}
            </span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class={`badge bg-${roleInfo.color}`}>{roleInfo.label}</span>
            <span
              class="material-icons-round text-body-secondary"
              style="font-size: 1.25rem; transition: transform 0.2s"
            >
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>

        {/* Kompakt-Info (immer sichtbar) */}
        <div class="card-body py-2">
          <div class="d-flex flex-wrap gap-2 align-items-center small">
            <span class="text-body-secondary">OE:</span>
            <span class="fw-medium">{joinOeLevels(currentUser.oe) || '–'}</span>

            <span
              class={`badge ${
                currentUser.emailVerified
                  ? 'bg-success-subtle text-success-emphasis'
                  : 'bg-danger-subtle text-danger-emphasis'
              }`}
              title={currentUser.email || undefined}
            >
              {currentUser.emailVerified ? 'E-Mail verifiziert' : 'E-Mail nicht verifiziert'}
            </span>

            {currentUser.adminForTeamOes.length > 0 && (
              <>
                <span class="text-body-secondary ms-2">Team:</span>
                {currentUser.adminForTeamOes.map(oe => (
                  <span key={oe} class="badge bg-info-subtle text-info-emphasis">
                    {oe}
                  </span>
                ))}
              </>
            )}
            {currentUser.adminForOrganizationOes.length > 0 && (
              <>
                <span class="text-body-secondary ms-2">Org:</span>
                {currentUser.adminForOrganizationOes.map(oe => (
                  <span key={oe} class="badge bg-warning-subtle text-warning-emphasis">
                    {oe}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Erweiterte Bearbeitung (aufklappbar) */}
        {isExpanded && (
          <div class="card-body border-top pt-3">
            {/* Rolle */}
            <div class="mb-3">
              <label class="form-label fw-semibold small mb-1">Rolle</label>
              <select
                class="form-select form-select-sm"
                value={edit.role}
                onInput={e => updateEdit({ role: (e.target as HTMLSelectElement).value as TUserRole })}
                disabled={!roleEditable || isSelfRow}
              >
                <option value="member">Mitglied</option>
                <option value="team-admin">Team-Admin</option>
                <option value="org-admin">Org-Admin</option>
                <option value="super-admin">Super-Admin</option>
              </select>
            </div>

            {/* OE */}
            <div class="mb-3">
              <label class="form-label fw-semibold small mb-1">OE</label>
              <OeLevelBoxes value={edit.oe} onChange={value => updateEdit({ oe: value })} disabled={!editable} />
            </div>

            {/* Team-Admin OEs */}
            <OeTagInput
              label="Team-Admin OEs"
              values={edit.adminForTeamOes}
              onChange={values => updateEdit({ adminForTeamOes: values })}
              disabled={!editable}
              placeholder="Team-OE hinzufügen…"
              defaultLevelCount={splitOeInput(edit.oe).length}
            />

            {/* Org-Admin OEs */}
            <OeTagInput
              label="Org-Admin OEs"
              values={edit.adminForOrganizationOes}
              onChange={values => updateEdit({ adminForOrganizationOes: values })}
              disabled={!editable}
              placeholder="Org-OE hinzufügen…"
              defaultLevelCount={splitOeInput(edit.oe).length}
            />

            <div class="border rounded p-2 mt-2">
              <div class="small fw-semibold mb-2">Spezielle Admin-Berechtigungen</div>

              <div class="form-check mb-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id={`perm-vorgaben-${currentUser._id}`}
                  checked={edit.canEditVorgabenGeld}
                  onChange={e => updateEdit({ canEditVorgabenGeld: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label class="form-check-label" for={`perm-vorgaben-${currentUser._id}`}>
                  Darf VorgabenGeld bearbeiten
                </label>
              </div>

              <div class="form-check mb-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id={`perm-templates-${currentUser._id}`}
                  checked={edit.canEditProfileTemplates}
                  onChange={e => {
                    const checked = (e.target as HTMLInputElement).checked;
                    updateEdit({
                      canEditProfileTemplates: checked,
                      canEditOwnTeamTemplatesOnly: checked ? edit.canEditOwnTeamTemplatesOnly : false,
                    });
                  }}
                  disabled={!permissionEditable}
                />
                <label class="form-check-label" for={`perm-templates-${currentUser._id}`}>
                  Darf Profile-Templates bearbeiten
                </label>
              </div>

              <div class="form-check mb-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id={`perm-teamonly-${currentUser._id}`}
                  checked={edit.canEditOwnTeamTemplatesOnly}
                  onChange={e => updateEdit({ canEditOwnTeamTemplatesOnly: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable || !edit.canEditProfileTemplates}
                />
                <label class="form-check-label" for={`perm-teamonly-${currentUser._id}`}>
                  Profile-Templates nur im eigenen Team/OE-Scope
                </label>
              </div>

              <div class="form-check mb-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id={`perm-formulare-erstellen-${currentUser._id}`}
                  checked={edit.canCreateFormularVorlagen}
                  onChange={e => updateEdit({ canCreateFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label class="form-check-label" for={`perm-formulare-erstellen-${currentUser._id}`}>
                  Darf Formular-Vorlagen erstellen
                </label>
                <div class="small text-body-secondary">Erstellen beinhaltet automatisch Bearbeiten.</div>
              </div>

              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id={`perm-formulare-bearbeiten-${currentUser._id}`}
                  checked={edit.canEditFormularVorlagen}
                  onChange={e => updateEdit({ canEditFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label class="form-check-label" for={`perm-formulare-bearbeiten-${currentUser._id}`}>
                  Darf Formular-Vorlagen bearbeiten
                </label>
              </div>

              {!permissionEditable && (
                <div class="small text-body-secondary mt-2">Nur Super-Admin kann diese Flags ändern.</div>
              )}
            </div>

            {/* Aktionsbuttons */}
            <div class="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
              {editable && (
                <>
                  <button
                    class="btn btn-primary btn-sm flex-grow-1"
                    onClick={onSave}
                    disabled={!changed || isSaving}
                    data-disabler
                  >
                    {isSaving ? (
                      <>
                        <span class="spinner-border spinner-border-sm me-1" role="status" />
                        Speichern…
                      </>
                    ) : (
                      <>
                        <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
                          save
                        </span>
                        Speichern
                      </>
                    )}
                  </button>
                  {changed && (
                    <button
                      class="btn btn-outline-secondary btn-sm"
                      onClick={onResetEdit}
                      disabled={isSaving}
                      title="Änderungen verwerfen"
                      data-disabler
                    >
                      <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle">
                        undo
                      </span>
                    </button>
                  )}
                </>
              )}
              <button
                class="btn btn-outline-secondary btn-sm flex-grow-1"
                onClick={onLoadAsUser}
                disabled={isSaving}
                data-disabler
              >
                <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
                  {isSelfRow ? 'home' : 'visibility'}
                </span>
                {isSelfRow ? 'Eigene Daten' : 'Daten laden'}
              </button>
              {editable && (
                <button
                  class="btn btn-outline-warning btn-sm"
                  onClick={() => createAdminUserPasswordModal(currentUser._id, currentUser.userName)}
                  disabled={isSaving}
                  title="Passwort für diesen Benutzer setzen"
                  data-disabler
                >
                  <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle">
                    password
                  </span>
                </button>
              )}
              {editable && (
                <button
                  class="btn btn-outline-info btn-sm"
                  onClick={() =>
                    createAdminUserLinksModal(currentUser._id, currentUser.userName, currentUser.emailVerified)
                  }
                  disabled={isSaving}
                  title="Verifizierungs-/Passwort-Reset-Link erzeugen"
                  data-disabler
                >
                  <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle">
                    link
                  </span>
                </button>
              )}
              {editable && (
                <button
                  class="btn btn-outline-danger btn-sm"
                  onClick={onDelete}
                  disabled={isSaving}
                  title="Benutzer löschen"
                  data-disabler
                >
                  <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle">
                    delete
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
