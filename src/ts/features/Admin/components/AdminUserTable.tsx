import { useEffect, useState } from 'preact/hooks';
import {
  fetchAdminUsers,
  updateUserOe,
  updateUserRole,
  updateUserScopes,
  setActAsUser,
  type AdminUserRow,
} from '../utils/api';
import type { TUserRole } from '../../../interfaces';
import { getUserCookie } from '../../../infrastructure/tokenManagement/decodeAccessToken';
import { loadUserDaten } from '../../Login/utils';
import Storage from '../../../infrastructure/storage/Storage';
import dayjs from '../../../infrastructure/date/configDayjs';
import { OeTagInput } from './OeTagInput';

type UserEditState = {
  oe: string;
  role: TUserRole;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
};

const ROLE_LABELS: Record<TUserRole, { label: string; color: string }> = {
  member: { label: 'Mitglied', color: 'secondary' },
  'team-admin': { label: 'Team-Admin', color: 'info' },
  'org-admin': { label: 'Org-Admin', color: 'warning' },
  'super-admin': { label: 'Super-Admin', color: 'danger' },
};

export function AdminUserList() {
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
  const user = getUserCookie();

  function buildEditState(entry: AdminUserRow): UserEditState {
    return {
      oe: entry.oe,
      role: entry.role,
      adminForTeamOes: [...entry.adminForTeamOes],
      adminForOrganizationOes: [...entry.adminForOrganizationOes],
    };
  }

  async function reloadUsers() {
    setLoading(true);
    try {
      const loadedUsers = await fetchAdminUsers({ name: filter.name, role: filter.role });
      setUsers(loadedUsers);
      setEdits(Object.fromEntries(loadedUsers.map(entry => [entry._id, buildEditState(entry)])));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadUsers();
  }, [filter.name, filter.role]);

  function canEdit() {
    if (!user) return false;
    return user.role === 'team-admin' || user.role === 'org-admin' || user.role === 'super-admin';
  }

  function canEditRole() {
    if (!user) return false;
    return user.role === 'org-admin' || user.role === 'super-admin';
  }

  function updateEdit(userId: string, patch: Partial<UserEditState>) {
    setEdits(current => ({ ...current, [userId]: { ...current[userId], ...patch } }));
  }

  function hasChanges(userId: string): boolean {
    const row = users.find(u => u._id === userId);
    const edit = edits[userId];
    if (!row || !edit) return false;

    return (
      edit.oe !== row.oe ||
      edit.role !== row.role ||
      edit.adminForTeamOes.join('|') !== row.adminForTeamOes.join('|') ||
      edit.adminForOrganizationOes.join('|') !== row.adminForOrganizationOes.join('|')
    );
  }

  async function handleLoadAsUser(userId: string) {
    if (!canEdit()) return;

    const row = users.find(u => u._id === userId);
    if (!row) return;

    const isSelfRow = user?.userName === row.userName;

    setSavingUserId(userId);
    try {
      if (isSelfRow) setActAsUser(null);
      else setActAsUser(row._id, row.userName);

      const jahr = Storage.get<number>('Jahr', { default: dayjs().year() });
      const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
      await loadUserDaten(monat, jahr);
      window.location.hash = '#start';
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

      if (edit.oe !== row.oe) {
        await updateUserOe(userId, edit.oe);
      }

      if (
        edit.adminForTeamOes.join('|') !== row.adminForTeamOes.join('|') ||
        edit.adminForOrganizationOes.join('|') !== row.adminForOrganizationOes.join('|')
      ) {
        await updateUserScopes(userId, {
          adminForTeamOes: edit.adminForTeamOes,
          adminForOrganizationOes: edit.adminForOrganizationOes,
        });
      }

      await reloadUsers();
    } finally {
      setSavingUserId(null);
    }
  }

  function handleResetEdit(userId: string) {
    const row = users.find(u => u._id === userId);
    if (row) setEdits(current => ({ ...current, [userId]: buildEditState(row) }));
  }

  const visibleUsers = users.filter(currentUser => {
    if (!filter.oe) return true;
    return currentUser.oe.toLowerCase().includes(filter.oe.toLowerCase());
  });

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
              value={filter.name}
              onInput={e => setFilter(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
            />
            <label for="adminFilterName">Name</label>
          </div>
        </div>
        <div class="col-12 col-sm-4">
          <div class="form-floating">
            <input
              type="text"
              class="form-control"
              id="adminFilterOe"
              placeholder="OE"
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

      {/* Ergebnis-Anzahl */}
      {!loading && visibleUsers.length > 0 && (
        <p class="text-body-secondary small mb-2">{visibleUsers.length} Benutzer gefunden</p>
      )}

      {/* User-Cards */}
      <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
        {visibleUsers.map(currentUser => {
          const isSelfRow = user?.userName === currentUser.userName;
          const edit = edits[currentUser._id] ?? buildEditState(currentUser);
          const isSaving = savingUserId === currentUser._id;
          const isExpanded = expandedUserId === currentUser._id;
          const changed = hasChanges(currentUser._id);
          const roleInfo = ROLE_LABELS[currentUser.role];
          const editable = canEdit() && !isSelfRow;

          return (
            <div key={currentUser._id} class="col">
              <div class={`card h-100 ${isSelfRow ? 'border-primary' : ''} ${changed ? 'border-warning' : ''}`}>
                {/* Card Header */}
                <div
                  class="card-header d-flex justify-content-between align-items-center py-2"
                  style="cursor: pointer"
                  onClick={() => setExpandedUserId(isExpanded ? null : currentUser._id)}
                >
                  <div class="d-flex align-items-center gap-2 text-truncate">
                    <span class="material-icons-round text-body-secondary" style="font-size: 1.25rem">
                      person
                    </span>
                    <span class="fw-semibold text-truncate">{currentUser.userName}</span>
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
                    <span class="fw-medium">{currentUser.oe || '–'}</span>

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
                        onInput={e =>
                          updateEdit(currentUser._id, {
                            role: (e.target as HTMLSelectElement).value as TUserRole,
                          })
                        }
                        disabled={!canEditRole() || isSelfRow}
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
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        value={edit.oe}
                        onInput={e => updateEdit(currentUser._id, { oe: (e.target as HTMLInputElement).value })}
                        disabled={!editable}
                      />
                    </div>

                    {/* Team-Admin OEs */}
                    <OeTagInput
                      label="Team-Admin OEs"
                      values={edit.adminForTeamOes}
                      onChange={values => updateEdit(currentUser._id, { adminForTeamOes: values })}
                      disabled={!editable}
                      placeholder="Team-OE hinzufügen…"
                    />

                    {/* Org-Admin OEs */}
                    <OeTagInput
                      label="Org-Admin OEs"
                      values={edit.adminForOrganizationOes}
                      onChange={values => updateEdit(currentUser._id, { adminForOrganizationOes: values })}
                      disabled={!editable}
                      placeholder="Org-OE hinzufügen…"
                    />

                    {/* Aktionsbuttons */}
                    <div class="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
                      {editable && (
                        <>
                          <button
                            class="btn btn-primary btn-sm flex-grow-1"
                            onClick={() => handleSave(currentUser._id)}
                            disabled={!changed || isSaving}
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
                              onClick={() => handleResetEdit(currentUser._id)}
                              disabled={isSaving}
                              title="Änderungen verwerfen"
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
                        onClick={() => handleLoadAsUser(currentUser._id)}
                        disabled={isSaving}
                      >
                        <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
                          {isSelfRow ? 'home' : 'visibility'}
                        </span>
                        {isSelfRow ? 'Eigene Daten' : 'Daten laden'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
