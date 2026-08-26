import { useEffect, useMemo, useState } from 'preact/hooks';
import Tooltip from 'bootstrap/js/dist/tooltip';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import {
  fetchAdminUsers,
  updateUserOe,
  updateUserRole,
  updateUserScopes,
  deleteUser,
  type AdminUserRow,
} from '../utils/api';
import { getUserCookie } from '@/infrastructure/tokenManagement/decodeAccessToken';
import { loadUserDataForAdminSelection } from '../utils/actAs';
import { useDebouncedValue, matchesOeQuery } from '../utils/adminUserListHelpers';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import createAdminBulkEditModal from './createAdminBulkEditModal';
import { AdminUserCard } from './AdminUserCard';
import type { UserEditState } from './adminUserListTypen';

export function AdminUserList({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const tooltipEls = Array.from(document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]'));
    const instances = tooltipEls.map(el => Tooltip.getOrCreateInstance(el));

    return () => {
      for (const instance of instances) instance.dispose();
    };
  });

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

  async function reloadUsers(nameFilter: string, roleFilter: string) {
    setLoading(true);
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
  }

  useEffect(() => {
    void reloadUsers(debouncedNameFilter.trim(), filter.role);
  }, [debouncedNameFilter, filter.role]);

  // Nach jedem Filterwechsel zeigt die Liste andere Benutzer — eine Auswahl aus
  // der vorherigen Ansicht wäre nicht mehr sichtbar und damit nicht überprüfbar.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedNameFilter, filter.role, filter.oe]);

  function canEdit() {
    if (!user) return false;
    return user.role === 'team-admin' || user.role === 'org-admin' || user.role === 'super-admin';
  }

  function canEditRole() {
    if (!user) return false;
    return user.role === 'org-admin' || user.role === 'super-admin';
  }

  function canEditPermissions() {
    if (!user) return false;
    return user.role === 'super-admin';
  }

  function updateEdit(userId: string, patch: Partial<UserEditState>) {
    setEdits(current => ({ ...current, [userId]: { ...current[userId], ...patch } }));
  }

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

  function resetFilters() {
    setFilter({ oe: '', name: '', role: '' });
  }

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

  function toggleSelection(userId: string) {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelectableSelected ? new Set() : new Set(selectableUsers.map(entry => entry._id)));
  }

  function openBulkEdit() {
    createAdminBulkEditModal(selectedUsers, () => {
      setSelectedIds(new Set());
      void reloadUsers(debouncedNameFilter.trim(), filter.role);
    });
  }

  return (
    <div>
      {/* Filter-Leiste */}
      <div class="row g-2 mb-3">
        <div class="col-12 col-sm-4">
          <div class="form-floating">
            <input
              type="text"
              class="form-control"
              id="adminFilterName"
              placeholder="Name"
              data-bs-toggle="tooltip"
              data-bs-title="Suche nach vollständigem Namen oder Benutzername"
              value={filter.name}
              onInput={e => setFilter(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
            />
            <label for="adminFilterName">Name / Benutzer</label>
          </div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="form-floating">
            <input
              type="text"
              class="form-control"
              id="adminFilterOe"
              placeholder="OE (z.B. IL 03, IL04, KSL)"
              data-bs-toggle="tooltip"
              data-bs-title="OE-Suche: tolerant für IL03/IL 03. Mehrere OEs mit Komma trennen"
              value={filter.oe}
              onInput={e => setFilter(f => ({ ...f, oe: (e.target as HTMLInputElement).value }))}
            />
            <label for="adminFilterOe">OE</label>
          </div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="form-floating">
            <select
              class="form-select"
              id="adminFilterRole"
              data-bs-toggle="tooltip"
              data-bs-title="Filtert Benutzer nach Rolle"
              value={filter.role}
              onChange={e => setFilter(f => ({ ...f, role: (e.target as HTMLSelectElement).value }))}
            >
              <option value="">Alle</option>
              <option value="member">Mitglied</option>
              <option value="team-admin">Team-Admin</option>
              <option value="org-admin">Org-Admin</option>
              <option value="super-admin">Super-Admin</option>
            </select>
            <label for="adminFilterRole">Rolle</label>
          </div>
        </div>
        <div class="col-12 d-flex justify-content-end gap-2">
          <button
            class="btn btn-outline-primary btn-sm"
            type="button"
            onClick={() => void refreshUsersNow()}
            data-bs-toggle="tooltip"
            data-bs-title="Lädt die Benutzerliste sofort neu"
          >
            <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
              refresh
            </span>
            Aktualisieren
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={resetFilters}
            disabled={!filter.name && !filter.oe && !filter.role}
            data-bs-toggle="tooltip"
            data-bs-title="Setzt Name-, OE- und Rollenfilter zurück"
          >
            <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
              filter_alt_off
            </span>
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {/* Ladeanzeige */}
      {loading && (
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Laden…</span>
          </div>
        </div>
      )}

      {/* Keine Ergebnisse */}
      {!loading && visibleUsers.length === 0 && (
        <div class="alert alert-secondary text-center" role="alert">
          Keine Benutzer gefunden.
        </div>
      )}

      {/* Ergebnis-Anzahl + Mehrfachauswahl */}
      {!loading && visibleUsers.length > 0 && (
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          {isSuperAdmin && selectableUsers.length > 0 && (
            <div class="form-check mb-0">
              <input
                class="form-check-input"
                type="checkbox"
                id="adminUserSelectAll"
                checked={allSelectableSelected}
                onChange={toggleSelectAll}
              />
              <label class="form-check-label small" for="adminUserSelectAll">
                Alle auswählen
              </label>
            </div>
          )}
          <span class="text-body-secondary small">{visibleUsers.length} Benutzer gefunden</span>
        </div>
      )}

      {/* Aktionsleiste bei aktiver Auswahl */}
      {isSuperAdmin && selectedUsers.length > 0 && (
        <div class="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 border rounded bg-body-tertiary sticky-top">
          <span class="fw-semibold small">{selectedUsers.length} ausgewählt</span>
          <button class="btn btn-primary btn-sm" type="button" onClick={openBulkEdit}>
            <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
              edit_note
            </span>
            Massenänderung
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" onClick={() => setSelectedIds(new Set())}>
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* User-Cards */}
      <div class="admin-user-cards">
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
