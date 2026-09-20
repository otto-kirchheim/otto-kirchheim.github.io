import type { TUserRole } from '@/types';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import type { AdminUserRow } from '../utils/api';
import createAdminUserLinksModal from './createAdminUserLinksModal';
import createAdminUserPasswordModal from './createAdminUserPasswordModal';
import { OeLevelBoxes } from './OeLevelBoxes';
import { OeTagInput } from './OeTagInput';
import { ROLE_LABELS, type UserEditState } from './adminUserListTypen';
import { DBButton, DBCheckbox, DBTag, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl } from '@/components';

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

/**
 * Benutzer-Karte: kompakte Kopfzeile und Übersicht (immer sichtbar) plus aufklappbarer Bearbeitungsbereich.
 *
 * @param props - Benutzerzeile, Bearbeitungsstand, Berechtigungs-/Zustands-Flags und die Callbacks der Liste.
 */
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
      <div
        className={`db-card ${isSelfRow ? 'border-primary' : ''} ${changed ? 'border-warning' : ''}`}
        data-spacing="none"
      >
        <div
          className="d-flex justify-content-between align-items-center py-2 px-3 bg-body-secondary border-bottom"
          style={{ cursor: 'pointer' }}
          onClick={onToggleExpand}
          title={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
        >
          <div className="d-flex align-items-center gap-2 text-truncate">
            {isSuperAdmin && !isSelfRow && (
              <DBCheckbox
                className="flex-shrink-0"
                size="small"
                label={`${currentUser.userName} für Massenänderung auswählen`}
                showLabel={false}
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
            <DBTag semantic={roleInfo.semantic} emphasis="strong">
              {roleInfo.label}
            </DBTag>
            <span
              className="db-icon text-body-secondary db-font-size-md"
              data-icon={isExpanded ? 'chevron_up' : 'chevron_down'}
              style={{ transition: 'transform 0.2s' }}
            />
          </div>
        </div>

        <div className="py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-center small">
            <span className="text-body-secondary">OE:</span>
            <span className="fw-medium">{joinOeLevels(currentUser.oe) || '–'}</span>

            <DBTag
              semantic={currentUser.emailVerified ? 'successful' : 'critical'}
              title={currentUser.email || undefined}
            >
              {currentUser.emailVerified ? 'E-Mail verifiziert' : 'E-Mail nicht verifiziert'}
            </DBTag>

            {currentUser.adminForTeamOes.length > 0 && (
              <>
                <span className="text-body-secondary ms-2">Team:</span>
                {currentUser.adminForTeamOes.map(oe => (
                  <DBTag key={oe} semantic="informational">
                    {oe}
                  </DBTag>
                ))}
              </>
            )}
            {currentUser.adminForOrganizationOes.length > 0 && (
              <>
                <span className="text-body-secondary ms-2">Org:</span>
                {currentUser.adminForOrganizationOes.map(oe => (
                  <DBTag key={oe} semantic="warning">
                    {oe}
                  </DBTag>
                ))}
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-top pt-3 pb-3 px-3">
            <div className="mb-3">
              <DbAuswahl
                beschriftung="Rolle"
                beschriftungZeigen
                dicht
                value={edit.role}
                onChange={e => updateEdit({ role: (e.target as HTMLSelectElement).value as TUserRole })}
                disabled={!roleEditable || isSelfRow}
              >
                <option value="member">Mitglied</option>
                <option value="team-admin">Team-Admin</option>
                <option value="org-admin">Org-Admin</option>
                <option value="super-admin">Super-Admin</option>
              </DbAuswahl>
            </div>

            <div className="mb-3">
              <label className="fw-semibold small mb-1">OE</label>
              <OeLevelBoxes value={edit.oe} onChange={value => updateEdit({ oe: value })} disabled={!editable} />
            </div>

            <OeTagInput
              label="Team-Admin OEs"
              values={edit.adminForTeamOes}
              onChange={values => updateEdit({ adminForTeamOes: values })}
              disabled={!editable}
              placeholder="Team-OE hinzufügen…"
              defaultLevelCount={splitOeInput(edit.oe).length}
            />

            <OeTagInput
              label="Org-Admin OEs"
              values={edit.adminForOrganizationOes}
              onChange={values => updateEdit({ adminForOrganizationOes: values })}
              disabled={!editable}
              placeholder="Org-OE hinzufügen…"
              defaultLevelCount={splitOeInput(edit.oe).length}
            />

            <div className="border p-2 mt-2">
              <div className="small fw-semibold mb-2">Spezielle Admin-Berechtigungen</div>

              <div className="mb-1">
                <DBCheckbox
                  size="small"
                  id={`perm-vorgaben-${currentUser._id}`}
                  label="Darf VorgabenGeld bearbeiten"
                  checked={edit.canEditVorgabenGeld}
                  onChange={e => updateEdit({ canEditVorgabenGeld: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
              </div>

              <div className="mb-1">
                <DBCheckbox
                  size="small"
                  id={`perm-templates-${currentUser._id}`}
                  label="Darf Profile-Templates bearbeiten"
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
              </div>

              <div className="mb-1">
                <DBCheckbox
                  size="small"
                  id={`perm-teamonly-${currentUser._id}`}
                  label="Profile-Templates nur im eigenen Team/OE-Scope"
                  checked={edit.canEditOwnTeamTemplatesOnly}
                  onChange={e => updateEdit({ canEditOwnTeamTemplatesOnly: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable || !edit.canEditProfileTemplates}
                />
              </div>

              <div className="mb-1">
                <DBCheckbox
                  size="small"
                  id={`perm-formulare-erstellen-${currentUser._id}`}
                  label="Darf Formular-Vorlagen erstellen"
                  checked={edit.canCreateFormularVorlagen}
                  onChange={e => updateEdit({ canCreateFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
                <div className="small text-body-secondary">Erstellen beinhaltet automatisch Bearbeiten.</div>
              </div>

              <div>
                <DBCheckbox
                  size="small"
                  id={`perm-formulare-bearbeiten-${currentUser._id}`}
                  label="Darf Formular-Vorlagen bearbeiten"
                  checked={edit.canEditFormularVorlagen}
                  onChange={e => updateEdit({ canEditFormularVorlagen: (e.target as HTMLInputElement).checked })}
                  disabled={!permissionEditable}
                />
              </div>

              {!permissionEditable && (
                <div className="small text-body-secondary mt-2">Nur Super-Admin kann diese Flags ändern.</div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
              {editable && (
                <>
                  <DBButton
                    type="button"
                    className="flex-grow-1"
                    variant="brand"
                    size="small"
                    icon={isSaving ? undefined : 'save'}
                    showIcon={!isSaving}
                    onClick={onSave}
                    disabled={!changed || isSaving}
                    data-disabler
                  >
                    {isSaving && <span className="laedt me-1" data-size="small" role="status" />}
                    {isSaving ? 'Speichern…' : 'Speichern'}
                  </DBButton>
                  {changed && (
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      icon="undo"
                      noText
                      onClick={onResetEdit}
                      disabled={isSaving}
                      data-disabler
                    >
                      <DBTooltip>Änderungen verwerfen</DBTooltip>
                    </DBButton>
                  )}
                </>
              )}
              <DBButton
                type="button"
                className="flex-grow-1"
                variant="outlined"
                size="small"
                icon={isSelfRow ? 'house' : 'eye'}
                onClick={onLoadAsUser}
                disabled={isSaving}
                data-disabler
              >
                {isSelfRow ? 'Eigene Daten' : 'Daten laden'}
              </DBButton>
              {editable && (
                <DBButton
                  type="button"
                  variant="outlined"
                  data-color="warning"
                  size="small"
                  icon="key"
                  noText
                  onClick={() => createAdminUserPasswordModal(currentUser._id, currentUser.userName)}
                  disabled={isSaving}
                  data-disabler
                >
                  <DBTooltip>Passwort für diesen Benutzer setzen</DBTooltip>
                </DBButton>
              )}
              {editable && (
                <DBButton
                  type="button"
                  variant="outlined"
                  data-color="informational"
                  size="small"
                  icon="link_chain"
                  noText
                  onClick={() =>
                    createAdminUserLinksModal(currentUser._id, currentUser.userName, currentUser.emailVerified)
                  }
                  disabled={isSaving}
                  data-disabler
                >
                  <DBTooltip>Verifizierungs-/Passwort-Reset-Link erzeugen</DBTooltip>
                </DBButton>
              )}
              {editable && (
                <DBButton
                  type="button"
                  variant="outlined"
                  data-color="critical"
                  size="small"
                  icon="bin"
                  noText
                  onClick={onDelete}
                  disabled={isSaving}
                  data-disabler
                >
                  <DBTooltip>Benutzer löschen</DBTooltip>
                </DBButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
