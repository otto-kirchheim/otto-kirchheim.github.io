import { DBButton, DBCheckbox, DBInfotext, DBTooltip } from '@db-ux/react-core-components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Role, ROLE_HIERARCHY } from '@otto-kirchheim/nebengeld-shared';
import { confirmDialog } from '@/shared/ui/dialog/confirmDialog';
import {
  fetchAdminUsers,
  updateUserOe,
  updateUserRole,
  updateUserScopes,
  deleteUser,
  type AdminUserRow,
} from '../utils/api';
import { getUserCookie } from '@/shared/api/token/decodeAccessToken';
import { loadUserDataForAdminSelection } from '../utils/actAs';
import { useDebouncedValue, matchesOeQuery } from '../utils/adminUserListHelpers';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import createAdminBulkEditModal from './createAdminBulkEditModal';
import { AdminUserCard } from './AdminUserCard';
import type { UserEditState } from './adminUserListTypen';
import { DbAuswahl, DbFeld } from '@/components';

/**
 * Benutzerverwaltung als Kartenliste mit Filter (Name, OE, Rolle), Einzelbearbeitung und Massenänderung.
 *
 * @param props - `isSuperAdmin`: schaltet Mehrfachauswahl und Massenänderung frei.
 */
export function AdminUserList({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  // Initial true: der Mount-Effect laedt sofort -- ein synchrones setLoading(true) im Effect
  // waere ein react-hooks/set-state-in-effect.
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ oe: string; name: string; role: string }>({
    oe: '',
    name: '',
    role: '',
  });
  const [edits, setEdits] = useState<Record<string, UserEditState>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const user = getUserCookie();
  const debouncedNameFilter = useDebouncedValue(filter.name, 300);

  /**
   * Leitet den Bearbeitungsstand einer Benutzerzeile ab.
   *
   * @param entry - Benutzerzeile aus der Admin-API.
   * @returns Bearbeitungsstand mit OE als Text und kopierten Listen.
   */
  function buildEditState(entry: AdminUserRow): UserEditState {
    return {
      oe: joinOeLevels(entry.oe),
      role: entry.role,
      adminForTeamOes: [...entry.adminForTeamOes],
      adminForOrganizationOes: [...entry.adminForOrganizationOes],
      canEditVorgabenGeld: entry.canEditVorgabenGeld,
      canEditProfileTemplates: entry.canEditProfileTemplates,
      canEditOwnTeamTemplatesOnly: entry.canEditOwnTeamTemplatesOnly,
      canCreateFormularVorlagen: entry.canCreateFormularVorlagen,
      canEditFormularVorlagen: entry.canEditFormularVorlagen,
    };
  }

  // Laedt ohne synchrones setLoading -- der Loading-Wechsel passiert im Aufrufer
  // (Event-Handler bzw. Renderphase-Reset unten), nie synchron im Effect.
  /**
   * Lädt die Benutzer und setzt die Bearbeitungsstände zurück; bei Fehlern wird die Liste geleert (Session-Fehler werden nicht geloggt).
   *
   * @param nameFilter - Namensfilter (bereits getrimmt).
   * @param roleFilter - Rollenfilter; leer = alle.
   */
  const ladeUsers = useCallback(async (nameFilter: string, roleFilter: string) => {
    try {
      const loadedUsers = await fetchAdminUsers({ name: nameFilter, role: roleFilter });
      setUsers(loadedUsers);
      setEdits(Object.fromEntries(loadedUsers.map(entry => [entry._id, buildEditState(entry)])));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/session ungültig|abgemeldet|token|erneuerung/i.test(message)) {
        console.error('Admin-Benutzer konnten nicht geladen werden:', error);
      }
      setUsers([]);
      setEdits({});
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lädt die Liste mit Ladeanzeige neu.
   *
   * @param nameFilter - Namensfilter.
   * @param roleFilter - Rollenfilter.
   * @returns Promise, das nach dem Laden erfüllt ist.
   */
  function reloadUsers(nameFilter: string, roleFilter: string) {
    setLoading(true);
    return ladeUsers(nameFilter, roleFilter);
  }

  // Filterwechsel: Loading-Anzeige + Auswahl-Reset bewusst in der Renderphase (React-Docs:
  // "adjusting state when props change"); die eigentliche Ladung bleibt im Effect.
  const nameFilter = debouncedNameFilter.trim();
  const [prevFilter, setPrevFilter] = useState({ name: nameFilter, role: filter.role, oe: filter.oe });
  if (prevFilter.name !== nameFilter || prevFilter.role !== filter.role || prevFilter.oe !== filter.oe) {
    setPrevFilter({ name: nameFilter, role: filter.role, oe: filter.oe });
    // Nach jedem Filterwechsel zeigt die Liste andere Benutzer — eine Auswahl aus
    // der vorherigen Ansicht wäre nicht mehr sichtbar und damit nicht überprüfbar.
    setSelectedIds(new Set());
    if (prevFilter.name !== nameFilter || prevFilter.role !== filter.role) setLoading(true);
  }

  useEffect(() => {
    // Microtask: der synchrone Funktionsaufruf direkt im Effect-Body loeste sonst
    // react-hooks/set-state-in-effect aus, obwohl alle setStates erst nach dem await laufen.
    queueMicrotask(() => void ladeUsers(nameFilter, filter.role));
  }, [ladeUsers, nameFilter, filter.role]);

  /**
   * Prüft, ob der angemeldete Benutzer Benutzerdaten bearbeiten darf.
   *
   * @returns `true` ab Team-Admin.
   */
  function canEdit() {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[Role.TEAM_ADMIN];
  }

  /**
   * Prüft, ob der angemeldete Benutzer Rollen ändern darf.
   *
   * @returns `true` ab Org-Admin.
   */
  function canEditRole() {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[Role.ORG_ADMIN];
  }

  /**
   * Prüft, ob der angemeldete Benutzer Sonderberechtigungen ändern darf.
   *
   * @returns `true` nur für Super-Admins.
   */
  function canEditPermissions() {
    if (!user) return false;
    return user.role === Role.SUPER_ADMIN;
  }

  /**
   * Ändert den Bearbeitungsstand eines Benutzers.
   *
   * @param userId - Id des Benutzers.
   * @param patch - Zu ändernde Felder des Bearbeitungsstands.
   */
  function updateEdit(userId: string, patch: Partial<UserEditState>) {
    setEdits(current => ({ ...current, [userId]: { ...current[userId], ...patch } }));
  }

  /**
   * Prüft auf ungespeicherte Änderungen eines Benutzers.
   *
   * @param userId - Id des Benutzers.
   * @returns `true`, wenn der Bearbeitungsstand vom geladenen Stand abweicht.
   */
  function hasChanges(userId: string): boolean {
    const row = users.find(u => u._id === userId);
    const edit = edits[userId];
    if (!row || !edit) return false;

    return (
      edit.oe !== joinOeLevels(row.oe) ||
      edit.role !== row.role ||
      edit.adminForTeamOes.join('|') !== row.adminForTeamOes.join('|') ||
      edit.adminForOrganizationOes.join('|') !== row.adminForOrganizationOes.join('|') ||
      edit.canEditVorgabenGeld !== row.canEditVorgabenGeld ||
      edit.canEditProfileTemplates !== row.canEditProfileTemplates ||
      edit.canEditOwnTeamTemplatesOnly !== row.canEditOwnTeamTemplatesOnly ||
      edit.canCreateFormularVorlagen !== row.canCreateFormularVorlagen ||
      edit.canEditFormularVorlagen !== row.canEditFormularVorlagen
    );
  }

  /**
   * Lädt die Daten des Benutzers in die App (für die eigene Zeile die eigenen Daten); erfordert Bearbeitungsrecht.
   *
   * @param userId - Id des Benutzers.
   */
  async function handleLoadAsUser(userId: string) {
    if (!canEdit()) return;

    const row = users.find(u => u._id === userId);
    if (!row) return;

    const isSelfRow = user?.userName === row.userName;

    setSavingUserId(userId);
    try {
      await loadUserDataForAdminSelection(isSelfRow ? null : row._id, isSelfRow ? undefined : row.userName);
    } finally {
      setSavingUserId(null);
    }
  }

  /**
   * Speichert geänderte Rolle, OE und Scopes/Berechtigungen des Benutzers mit je einem API-Aufruf, nur soweit geändert; die eigene Zeile wird nie gespeichert.
   *
   * @param userId - Id des Benutzers.
   */
  async function handleSave(userId: string) {
    if (!canEdit()) return;

    const row = users.find(u => u._id === userId);
    const edit = edits[userId];
    if (!row || !edit) return;

    const isSelfRow = user?.userName === row.userName;
    if (isSelfRow) return;

    setSavingUserId(userId);
    try {
      if (edit.role !== row.role && canEditRole()) {
        await updateUserRole(userId, edit.role);
      }

      if (edit.oe !== joinOeLevels(row.oe)) {
        await updateUserOe(userId, splitOeInput(edit.oe));
      }

      if (
        edit.adminForTeamOes.join('|') !== row.adminForTeamOes.join('|') ||
        edit.adminForOrganizationOes.join('|') !== row.adminForOrganizationOes.join('|') ||
        edit.canEditVorgabenGeld !== row.canEditVorgabenGeld ||
        edit.canEditProfileTemplates !== row.canEditProfileTemplates ||
        edit.canEditOwnTeamTemplatesOnly !== row.canEditOwnTeamTemplatesOnly ||
        edit.canCreateFormularVorlagen !== row.canCreateFormularVorlagen ||
        edit.canEditFormularVorlagen !== row.canEditFormularVorlagen
      ) {
        await updateUserScopes(userId, {
          adminForTeamOes: edit.adminForTeamOes,
          adminForOrganizationOes: edit.adminForOrganizationOes,
          canEditVorgabenGeld: edit.canEditVorgabenGeld,
          canEditProfileTemplates: edit.canEditProfileTemplates,
          canEditOwnTeamTemplatesOnly: edit.canEditOwnTeamTemplatesOnly,
          canCreateFormularVorlagen: edit.canCreateFormularVorlagen,
          canEditFormularVorlagen: edit.canEditFormularVorlagen,
        });
      }

      await reloadUsers(debouncedNameFilter.trim(), filter.role);
    } finally {
      setSavingUserId(null);
    }
  }

  /**
   * Löscht einen Benutzer nach Bestätigung; die eigene Zeile bleibt ausgenommen.
   *
   * @param userId - Id des Benutzers.
   */
  async function handleDelete(userId: string) {
    if (!canEdit()) return;

    const row = users.find(u => u._id === userId);
    if (!row) return;

    const isSelfRow = user?.userName === row.userName;
    if (isSelfRow) return;

    const confirmed = await confirmDialog(
      `Benutzer "${row.userName}" wirklich löschen?\nDieser Vorgang kann nicht rückgängig gemacht werden.`,
    );
    if (!confirmed) return;

    setSavingUserId(userId);
    try {
      await deleteUser(userId);
      await reloadUsers(debouncedNameFilter.trim(), filter.role);
    } finally {
      setSavingUserId(null);
    }
  }

  /**
   * Verwirft die Änderungen eines Benutzers und stellt den geladenen Stand wieder her.
   *
   * @param userId - Id des Benutzers.
   */
  function handleResetEdit(userId: string) {
    const row = users.find(u => u._id === userId);
    if (row) setEdits(current => ({ ...current, [userId]: buildEditState(row) }));
  }

  const visibleUsers = useMemo(() => {
    const nameQuery = filter.name.trim().toLowerCase();
    const oeQuery = filter.oe.trim();
    if (!nameQuery && !oeQuery) return users;

    return users.filter(currentUser => {
      const fullNameMatch = currentUser.fullName.toLowerCase().includes(nameQuery);
      const userNameMatch = currentUser.userName.toLowerCase().includes(nameQuery);
      const matchesName = !nameQuery || fullNameMatch || userNameMatch;

      const oeCandidates = [...currentUser.oe, ...currentUser.adminForTeamOes, ...currentUser.adminForOrganizationOes];
      const matchesOe = matchesOeQuery(oeQuery, oeCandidates);

      return matchesName && matchesOe;
    });
  }, [users, filter.name, filter.oe]);

  /**
   * Setzt Name-, OE- und Rollenfilter zurück.
   */
  function resetFilters() {
    setFilter({ oe: '', name: '', role: '' });
  }

  /**
   * Lädt die Liste sofort neu, ohne das Debouncing des Namensfilters abzuwarten.
   */
  async function refreshUsersNow() {
    await reloadUsers(filter.name.trim(), filter.role);
  }

  // Die eigene Zeile bleibt außen vor: Rolle, OE und Rechte des handelnden
  // Admins werden auch einzeln nicht über diese Oberfläche geändert.
  const selectableUsers = useMemo(
    () => visibleUsers.filter(currentUser => currentUser.userName !== user?.userName),
    [visibleUsers, user?.userName],
  );

  const selectedUsers = useMemo(
    () => selectableUsers.filter(currentUser => selectedIds.has(currentUser._id)),
    [selectableUsers, selectedIds],
  );

  const allSelectableSelected = selectableUsers.length > 0 && selectedUsers.length === selectableUsers.length;

  /**
   * Schaltet einen Benutzer in der Mehrfachauswahl um.
   *
   * @param userId - Id des Benutzers.
   */
  function toggleSelection(userId: string) {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  /**
   * Wählt alle auswählbaren Benutzer aus oder hebt die Auswahl auf, wenn bereits alle gewählt sind.
   */
  function toggleSelectAll() {
    setSelectedIds(allSelectableSelected ? new Set() : new Set(selectableUsers.map(entry => entry._id)));
  }

  /**
   * Öffnet den Massenänderungs-Dialog für die Auswahl; nach dem Anwenden wird die Auswahl geleert und die Liste neu geladen.
   */
  function openBulkEdit() {
    createAdminBulkEditModal(selectedUsers, () => {
      setSelectedIds(new Set());
      void reloadUsers(debouncedNameFilter.trim(), filter.role);
    });
  }

  return (
    <div>
      <div className="raster mb-3 abstand-2">
        <div className="sp-sm-4">
          <div>
            <DbFeld
              beschriftung="Name / Benutzer"
              beschriftungZeigen
              type="text"
              id="adminFilterName"
              placeholder="z.B. Nachname oder Benutzername"
              value={filter.name}
              onChange={e => setFilter(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
            />
            <DBInfotext size="small" semantic="informational">
              Sucht in Name und Benutzername
            </DBInfotext>
          </div>
        </div>
        <div className="sp-sm-4">
          <div>
            <DbFeld
              beschriftung="OE"
              beschriftungZeigen
              type="text"
              id="adminFilterOe"
              placeholder="z.B. IL 03, IL04, KSL"
              value={filter.oe}
              onChange={e => setFilter(f => ({ ...f, oe: (e.target as HTMLInputElement).value }))}
            />
            <DBInfotext size="small" semantic="informational">
              IL03 und IL 03 finden dasselbe; mehrere OEs mit Komma trennen
            </DBInfotext>
          </div>
        </div>
        <div className="sp-sm-4">
          <div>
            <DbAuswahl
              beschriftung="Rolle"
              beschriftungZeigen
              id="adminFilterRole"
              value={filter.role}
              onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}
            >
              <option value="">Alle</option>
              <option value={Role.MEMBER}>Mitglied</option>
              <option value={Role.TEAM_ADMIN}>Team-Admin</option>
              <option value={Role.ORG_ADMIN}>Org-Admin</option>
              <option value={Role.SUPER_ADMIN}>Super-Admin</option>
            </DbAuswahl>
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2">
          <DBButton
            variant="outlined"
            size="small"
            type="button"
            icon="circular_arrows"
            onClick={() => void refreshUsersNow()}
          >
            <DBTooltip placement="top">Lädt die Benutzerliste sofort neu</DBTooltip>
            Aktualisieren
          </DBButton>
          <DBButton
            variant="outlined"
            size="small"
            type="button"
            onClick={resetFilters}
            disabled={!filter.name && !filter.oe && !filter.role}
          >
            <DBTooltip placement="top">Setzt Name-, OE- und Rollenfilter zurück</DBTooltip>
            <span className="app-icon app-icon--filter-off me-1 db-font-size-sm" style={{ verticalAlign: 'middle' }} />
            Filter zurücksetzen
          </DBButton>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="laedt text-primary" role="status">
            <span className="visually-hidden">Laden…</span>
          </div>
        </div>
      )}

      {!loading && visibleUsers.length === 0 && (
        <p className="text-body-secondary text-center">Keine Benutzer gefunden.</p>
      )}

      {!loading && visibleUsers.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          {isSuperAdmin && selectableUsers.length > 0 && (
            <div className="mb-0">
              <DBCheckbox
                size="small"
                id="adminUserSelectAll"
                label="Alle auswählen"
                checked={allSelectableSelected}
                onChange={toggleSelectAll}
              />
            </div>
          )}
          <span className="text-body-secondary small">{visibleUsers.length} Benutzer gefunden</span>
        </div>
      )}

      {isSuperAdmin && selectedUsers.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 border bg-body-tertiary sticky-top">
          <span className="fw-semibold small">{selectedUsers.length} ausgewählt</span>
          <DBButton variant="brand" size="small" type="button" icon="pen" onClick={openBulkEdit}>
            Massenänderung
          </DBButton>
          <DBButton variant="outlined" size="small" type="button" onClick={() => setSelectedIds(new Set())}>
            Auswahl aufheben
          </DBButton>
        </div>
      )}

      <div className="admin-user-cards">
        {visibleUsers.map(currentUser => {
          const isSelfRow = user?.userName === currentUser.userName;
          const edit = edits[currentUser._id] ?? buildEditState(currentUser);

          return (
            <AdminUserCard
              key={currentUser._id}
              currentUser={currentUser}
              edit={edit}
              isSuperAdmin={isSuperAdmin}
              isSelfRow={isSelfRow}
              isSaving={savingUserId === currentUser._id}
              isExpanded={expandedUserId === currentUser._id}
              isSelected={selectedIds.has(currentUser._id)}
              changed={hasChanges(currentUser._id)}
              editable={canEdit() && !isSelfRow}
              roleEditable={canEditRole()}
              permissionEditable={canEditPermissions() && !isSelfRow}
              onToggleExpand={() => setExpandedUserId(expandedUserId === currentUser._id ? null : currentUser._id)}
              onToggleSelection={() => toggleSelection(currentUser._id)}
              updateEdit={patch => updateEdit(currentUser._id, patch)}
              onSave={() => handleSave(currentUser._id)}
              onResetEdit={() => handleResetEdit(currentUser._id)}
              onLoadAsUser={() => handleLoadAsUser(currentUser._id)}
              onDelete={() => void handleDelete(currentUser._id)}
            />
          );
        })}
      </div>
    </div>
  );
}
