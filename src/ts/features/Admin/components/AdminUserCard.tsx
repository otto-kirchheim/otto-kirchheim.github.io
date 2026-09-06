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
    <div className="admin-user-card-col">
      <div className={`card ${isSelfRow ? 'border-primary' : ''} ${changed ? 'border-warning' : ''}`}>
        {/* Card Header */}
        <div
          className="card-header d-flex justify-content-between align-items-center py-2"
          style={{ cursor: 'pointer' }}
          onClick={onToggleExpand}
          title={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
        >
          <div className="d-flex align-items-center gap-2 text-truncate">
            {isSuperAdmin && !isSelfRow && (
              <input
                className="form-check-input mt-0 flex-shrink-0"
                type="checkbox"
                aria-label={`${currentUser.userName} für Massenänderung auswählen`}
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={onToggleSelection}
              />
            )}
            <span className="db-icon text-body-secondary db-font-size-md" data-icon="person" />
            <span className="text-truncate">
              <span className="fw-semibold d-block text-truncate">{currentUser.fullName || currentUser.userName}</span>
              {currentUser.fullName && (
                <span className="small text-body-secondary d-block text-truncate">{currentUser.userName}</span>
              )}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${roleInfo.color}`}>{roleInfo.label}</span>
            <span
              className="db-icon text-body-secondary db-font-size-md"
              data-icon={isExpanded ? 'chevron_up' : 'chevron_down'}
              style={{ transition: 'transform 0.2s' }}
            />
          </div>
        </div>

        {/* Kompakt-Info (immer sichtbar) */}
        <div className="card-body py-2">
          <div className="d-flex flex-wrap gap-2 align-items-center small">
            <span className="text-body-secondary">OE:</span>
            <span className="fw-medium">{joinOeLevels(currentUser.oe) || '–'}</span>

            <span
              className={`badge ${
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
                <span className="text-body-secondary ms-2">Team:</span>
                {currentUser.adminForTeamOes.map(oe => (
                  <span key={oe} className="badge bg-info-subtle text-info-emphasis">
                    {oe}
                  </span>
                ))}
              </>
            )}
            {currentUser.adminForOrganizationOes.length > 0 && (
              <>
                <span className="text-body-secondary ms-2">Org:</span>
                {currentUser.adminForOrganizationOes.map(oe => (
                  <span key={oe} className="badge bg-warning-subtle text-warning-emphasis">
                    {oe}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Erweiterte Bearbeitung (aufklappbar) */}
        {isExpanded && (
          <div className="card-body border-top pt-3">
            {/* Rolle */}
            <div className="mb-3">
              <label className="form-label fw-semibold small mb-1">Rolle</label>
              <select
                className="form-select form-select-sm"
                value={edit.role}
                onChange={e => updateEdit({ role: (e.target as HTMLSelectElement).value as TUserRole })}
                disabled={!roleEditable || isSelfRow}
              >
                <option value="member">Mitglied</option>
                <option value="team-admin">Team-Admin</option>
                <option value="org-admin">Org-Admin</option>
                <option value="super-admin">Super-Admin</option>
              </select>
            </div>

            {/* OE */}
            <div className="mb-3">
              <label className="form-label fw-semibold small mb-1">OE</label>
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

            <div className="border rounded p-2 mt-2">
              <div className="small fw-semibold mb-2">Spezielle Admin-Berechtigungen</div>

              <div className="form-check mb-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`perm-vorgaben-${currentUser._id}`}
                  checked={edit.canEditVorgabenGeld}
                  onChange={e => updateEdit({ canEditVorgabenGeld: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label className="form-check-label" htmlFor={`perm-vorgaben-${currentUser._id}`}>
                  Darf VorgabenGeld bearbeiten
                </label>
              </div>

              <div className="form-check mb-1">
                <input
                  className="form-check-input"
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
                <label className="form-check-label" htmlFor={`perm-templates-${currentUser._id}`}>
                  Darf Profile-Templates bearbeiten
                </label>
              </div>

              <div className="form-check mb-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`perm-teamonly-${currentUser._id}`}
                  checked={edit.canEditOwnTeamTemplatesOnly}
                  onChange={e => updateEdit({ canEditOwnTeamTemplatesOnly: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable || !edit.canEditProfileTemplates}
                />
                <label className="form-check-label" htmlFor={`perm-teamonly-${currentUser._id}`}>
                  Profile-Templates nur im eigenen Team/OE-Scope
                </label>
              </div>

              <div className="form-check mb-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`perm-formulare-erstellen-${currentUser._id}`}
                  checked={edit.canCreateFormularVorlagen}
                  onChange={e => updateEdit({ canCreateFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label className="form-check-label" htmlFor={`perm-formulare-erstellen-${currentUser._id}`}>
                  Darf Formular-Vorlagen erstellen
                </label>
                <div className="small text-body-secondary">Erstellen beinhaltet automatisch Bearbeiten.</div>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`perm-formulare-bearbeiten-${currentUser._id}`}
                  checked={edit.canEditFormularVorlagen}
                  onChange={e => updateEdit({ canEditFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <label className="form-check-label" htmlFor={`perm-formulare-bearbeiten-${currentUser._id}`}>
                  Darf Formular-Vorlagen bearbeiten
                </label>
              </div>

              {!permissionEditable && (
                <div className="small text-body-secondary mt-2">Nur Super-Admin kann diese Flags ändern.</div>
              )}
            </div>

            {/* Aktionsbuttons */}
            <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
              {editable && (
                <>
                  <button
                    className="db-button flex-grow-1"
                    data-variant="brand"
                    data-size="small"
                    onClick={onSave}
                    disabled={!changed || isSaving}
                    data-disabler
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                        Speichern…
                      </>
                    ) : (
                      <>
                        <span
                          className="db-icon me-1 db-font-size-sm"
                          data-icon="save"
                          style={{ verticalAlign: 'middle' }}
                        />
                        Speichern
                      </>
                    )}
                  </button>
                  {changed && (
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-size="small"
                      onClick={onResetEdit}
                      disabled={isSaving}
                      title="Änderungen verwerfen"
                      data-disabler
                    >
                      <span className="db-icon db-font-size-sm" data-icon="undo" style={{ verticalAlign: 'middle' }} />
                    </button>
                  )}
                </>
              )}
              <button
                className="db-button flex-grow-1"
                data-variant="outlined"
                data-size="small"
                onClick={onLoadAsUser}
                disabled={isSaving}
                data-disabler
              >
                <span
                  className="db-icon me-1 db-font-size-sm"
                  data-icon={isSelfRow ? 'house' : 'eye'}
                  style={{ verticalAlign: 'middle' }}
                />
                {isSelfRow ? 'Eigene Daten' : 'Daten laden'}
              </button>
              {editable && (
                <button
                  className="db-button"
                  data-variant="outlined"
                  data-color="warning"
                  data-size="small"
                  onClick={() => createAdminUserPasswordModal(currentUser._id, currentUser.userName)}
                  disabled={isSaving}
                  title="Passwort für diesen Benutzer setzen"
                  data-disabler
                >
                  <span className="db-icon db-font-size-sm" data-icon="key" style={{ verticalAlign: 'middle' }} />
                </button>
              )}
              {editable && (
                <button
                  className="db-button"
                  data-variant="outlined"
                  data-color="informational"
                  data-size="small"
                  onClick={() =>
                    createAdminUserLinksModal(currentUser._id, currentUser.userName, currentUser.emailVerified)
                  }
                  disabled={isSaving}
                  title="Verifizierungs-/Passwort-Reset-Link erzeugen"
                  data-disabler
                >
                  <span
                    className="db-icon db-font-size-sm"
                    data-icon="link_chain"
                    style={{ verticalAlign: 'middle' }}
                  />
                </button>
              )}
              {editable && (
                <button
                  className="db-button"
                  data-variant="outlined"
                  data-color="critical"
                  data-size="small"
                  onClick={onDelete}
                  disabled={isSaving}
                  title="Benutzer löschen"
                  data-disabler
                >
                  <span className="db-icon db-font-size-sm" data-icon="bin" style={{ verticalAlign: 'middle' }} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
