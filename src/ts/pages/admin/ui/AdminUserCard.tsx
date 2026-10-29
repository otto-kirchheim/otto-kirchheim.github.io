import { Role } from '@otto-kirchheim/nebengeld-shared';
import { joinOeLevels } from '@/shared/lib/ressource/oeLevels';
import type { AdminUserRow } from '../api/api';
import createAdminUserLinksModal from './createAdminUserLinksModal';
import createAdminUserPasswordModal from './createAdminUserPasswordModal';
import createAdminUserScopeModal from './createAdminUserScopeModal';
import { EntfernbareTagListe } from './EntfernbareTagListe';
import { ROLE_LABELS, sichtbareBloecke, type UserEditState } from './adminUserListTypen';
import {
  DBButton,
  DBCheckbox,
  DBInfotext,
  DBLoadingIndicator,
  DBStack,
  DBTag,
  DBTooltip,
} from '@db-ux/react-core-components';
import { Gruppe } from '@/shared/ui/gruppe/Gruppe';

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
  const editRoleInfo = ROLE_LABELS[edit.role];
  const zeige = sichtbareBloecke(edit.role);

  function oeffneScopeDialog(): void {
    createAdminUserScopeModal(
      currentUser.fullName || currentUser.userName,
      {
        role: edit.role,
        oe: edit.oe,
        adminForTeamOes: edit.adminForTeamOes,
        adminForStuetzpunkte: edit.adminForStuetzpunkte,
        adminForOrganizationOes: edit.adminForOrganizationOes,
      },
      roleEditable && !isSelfRow,
      updateEdit,
    );
  }

  return (
    <div className="admin-user-card-col">
      <div
        className={`db-card admin-user-card ${isSelfRow ? 'admin-user-card--ich' : ''} ${changed ? 'admin-user-card--geaendert' : ''}`}
        data-spacing="none"
        style={{ overflow: 'hidden' }}
      >
        <div
          className="admin-user-card__kopf"
          onClick={onToggleExpand}
          title={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
        >
          <DBStack direction="row" alignment="center" gap="x-small" className="abschneiden">
            {isSuperAdmin && !isSelfRow && (
              <DBCheckbox
                className="nicht-schrumpfen"
                size="small"
                label={`${currentUser.userName} für Massenänderung auswählen`}
                showLabel={false}
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={onToggleSelection}
              />
            )}
            <span className="db-icon farbe-gedaempft db-font-size-md" data-icon="person" />
            <span className="abschneiden">
              <strong className="abschneiden admin-user-card__name">
                {currentUser.fullName || currentUser.userName}
              </strong>
              {currentUser.fullName && (
                <DBInfotext showIcon={false} className="infotext-block abschneiden">
                  {currentUser.userName}
                </DBInfotext>
              )}
            </span>
          </DBStack>
          <DBStack direction="row" alignment="center" gap="x-small" className="nicht-schrumpfen">
            <DBTag semantic={roleInfo.semantic} emphasis="strong" className="rollen-tag">
              {roleInfo.label}
            </DBTag>
            <span
              className="db-icon farbe-gedaempft db-font-size-md"
              data-icon={isExpanded ? 'chevron_up' : 'chevron_down'}
              style={{ transition: 'transform 0.2s' }}
            />
          </DBStack>
        </div>

        <div className="admin-user-card__zeile">
          <DBStack gap="2x-small" className="zelle-klein">
            <DBStack direction="row" wrap gap="x-small" alignment="center">
              <DBInfotext showIcon={false}>OE:</DBInfotext>
              <strong className="admin-user-card__wert">{joinOeLevels(currentUser.oe) || '–'}</strong>

              <DBTag
                semantic={currentUser.emailVerified ? 'successful' : 'critical'}
                title={currentUser.email || undefined}
              >
                {currentUser.emailVerified ? 'E-Mail verifiziert' : 'E-Mail nicht verifiziert'}
              </DBTag>
            </DBStack>

            {currentUser.adminForTeamOes.length > 0 && (
              <DBStack direction="row" wrap gap="x-small" alignment="center">
                <DBInfotext showIcon={false}>Team:</DBInfotext>
                {currentUser.adminForTeamOes.map(oe => (
                  <DBTag key={oe} semantic="informational">
                    {oe}
                  </DBTag>
                ))}
              </DBStack>
            )}
            {currentUser.adminForStuetzpunkte.length > 0 && (
              <DBStack direction="row" wrap gap="x-small" alignment="center">
                <DBInfotext showIcon={false}>Stützpunkt:</DBInfotext>
                {currentUser.adminForStuetzpunkte.map(stuetzpunkt => (
                  <DBTag key={stuetzpunkt} semantic="informational">
                    {stuetzpunkt}
                  </DBTag>
                ))}
              </DBStack>
            )}
            {currentUser.adminForOrganizationOes.length > 0 && (
              <DBStack direction="row" wrap gap="x-small" alignment="center">
                <DBInfotext showIcon={false}>Org:</DBInfotext>
                {currentUser.adminForOrganizationOes.map(oe => (
                  <DBTag key={oe} semantic="warning">
                    {oe}
                  </DBTag>
                ))}
              </DBStack>
            )}
          </DBStack>
        </div>

        {isExpanded && (
          <DBStack gap="small" className="admin-user-card__detail">
            <DBStack direction="row" wrap gap="x-small" alignment="center" className="zelle-klein">
              <DBInfotext showIcon={false}>Rolle:</DBInfotext>
              <DBTag semantic={editRoleInfo.semantic} emphasis="strong">
                {editRoleInfo.label}
              </DBTag>
              <DBInfotext showIcon={false}>OE:</DBInfotext>
              <strong className="admin-user-card__wert">{edit.oe || '–'}</strong>
              {editable && (
                <DBButton
                  type="button"
                  variant="outlined"
                  size="small"
                  icon="pen"
                  onClick={oeffneScopeDialog}
                  disabled={isSaving}
                  data-disabler
                >
                  Bearbeiten
                </DBButton>
              )}
            </DBStack>

            {zeige.team && (
              <EntfernbareTagListe
                label="Team-Admin OEs"
                values={edit.adminForTeamOes}
                onChange={values => updateEdit({ adminForTeamOes: values })}
                disabled={!editable}
              />
            )}

            {zeige.team && (
              <EntfernbareTagListe
                label="Team-Admin Stützpunkte"
                values={edit.adminForStuetzpunkte}
                onChange={values => updateEdit({ adminForStuetzpunkte: values })}
                disabled={!editable}
              />
            )}

            {zeige.org && (
              <EntfernbareTagListe
                label="Org-Admin OEs"
                values={edit.adminForOrganizationOes}
                onChange={values => updateEdit({ adminForOrganizationOes: values })}
                disabled={!editable}
                semantic="warning"
              />
            )}

            {zeige.berechtigungen && (
              <Gruppe titel="Spezielle Admin-Berechtigungen">
                <DBStack gap="2x-small">
                  <div>
                    <DBCheckbox
                      size="small"
                      id={`perm-vorgaben-${currentUser._id}`}
                      label="Darf VorgabenGeld bearbeiten"
                      checked={edit.canEditVorgabenGeld}
                      onChange={e => updateEdit({ canEditVorgabenGeld: (e.target as HTMLInputElement).checked })}
                      disabled={!permissionEditable}
                    />
                  </div>

                  <div>
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

                  {edit.canEditProfileTemplates && edit.role === Role.TEAM_ADMIN && (
                    <DBInfotext showIcon={false} className="infotext-block">
                      Team-Admin bearbeitet nur Vorlagen der eigenen Team-OE (und ggf. Stützpunkte); das Muster ist
                      immer lesbar.
                    </DBInfotext>
                  )}

                  {edit.canEditProfileTemplates && edit.role !== Role.TEAM_ADMIN && (
                    <div>
                      <DBCheckbox
                        size="small"
                        id={`perm-teamonly-${currentUser._id}`}
                        label="Profile-Templates nur im eigenen OE-Scope"
                        checked={edit.canEditOwnTeamTemplatesOnly}
                        onChange={e =>
                          updateEdit({ canEditOwnTeamTemplatesOnly: (e.target as HTMLInputElement).checked })
                        }
                        disabled={!permissionEditable}
                      />
                    </div>
                  )}

                  <div>
                    <DBCheckbox
                      size="small"
                      id={`perm-formulare-bearbeiten-${currentUser._id}`}
                      label="Darf Formular-Vorlagen bearbeiten"
                      checked={edit.canEditFormularVorlagen}
                      onChange={e => {
                        const checked = (e.target as HTMLInputElement).checked;
                        updateEdit({
                          canEditFormularVorlagen: checked,
                          canCreateFormularVorlagen: checked ? edit.canCreateFormularVorlagen : false,
                        });
                      }}
                      disabled={!permissionEditable}
                    />
                  </div>

                  {edit.canEditFormularVorlagen && (
                    <div>
                      <DBCheckbox
                        size="small"
                        id={`perm-formulare-erstellen-${currentUser._id}`}
                        label="Darf Formular-Vorlagen erstellen"
                        checked={edit.canCreateFormularVorlagen}
                        onChange={e =>
                          updateEdit({ canCreateFormularVorlagen: (e.target as HTMLInputElement).checked })
                        }
                        disabled={!permissionEditable}
                      />
                      <DBInfotext showIcon={false} className="infotext-block">
                        Erstellen beinhaltet automatisch Bearbeiten.
                      </DBInfotext>
                    </div>
                  )}

                  {!permissionEditable && (
                    <DBInfotext showIcon={false} className="infotext-block">
                      Nur Super-Admin kann diese Flags ändern.
                    </DBInfotext>
                  )}
                </DBStack>
              </Gruppe>
            )}

            <DBStack direction="row" wrap gap="x-small" className="admin-user-card__aktionen">
              {editable && (
                <>
                  <DBButton
                    type="button"
                    className="waechst"
                    variant="brand"
                    size="small"
                    icon="save"
                    onClick={onSave}
                    disabled={!changed || isSaving}
                    data-disabler
                  >
                    <DBLoadingIndicator overlay autoDisable={false} state={isSaving ? 'active' : 'inactive'}>
                      Speichert
                    </DBLoadingIndicator>
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
                className="waechst"
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
            </DBStack>
          </DBStack>
        )}
      </div>
    </div>
  );
}
