import { useEffect, useState } from 'react';

import {
  fetchAdminUsers,
  updateUserOe,
  updateUserRole,
  updateUserScopes,
  setActAsUser,
  type AdminUserRow,
} from '../utils/api';
import type { TUserRole } from '@/types';
import { getUserCookie } from '@/infrastructure/tokenManagement/decodeAccessToken';
import { loadUserDaten } from '@/core/orchestration/auth/utils';
import Storage from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { OeTagInput } from './OeTagInput';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';

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
      oe: joinOeLevels(entry.oe),
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
      edit.oe !== joinOeLevels(row.oe) ||
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

      if (edit.oe !== joinOeLevels(row.oe)) {
        await updateUserOe(userId, splitOeInput(edit.oe));
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
    return joinOeLevels(currentUser.oe).toLowerCase().includes(filter.oe.toLowerCase());
  });

  return (
    <div>
      {/* Filter-Leiste */}
      <div className="raster mb-3 abstand-2">
        <div className="sp-sm-4">
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="adminFilterName"
              placeholder="Name"
              value={filter.name}
              onChange={e => setFilter(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
            />
            <label htmlFor="adminFilterName">Name</label>
          </div>
        </div>
        <div className="sp-sm-4">
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="adminFilterOe"
              placeholder="OE"
              value={filter.oe}
              onChange={e => setFilter(f => ({ ...f, oe: (e.target as HTMLInputElement).value }))}
            />
            <label htmlFor="adminFilterOe">OE</label>
          </div>
        </div>
        <div className="sp-sm-4">
          <div className="form-floating">
            <select
              className="form-select"
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
            <label htmlFor="adminFilterRole">Rolle</label>
          </div>
        </div>
      </div>

      {/* Ladeanzeige */}
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Laden…</span>
          </div>
        </div>
      )}

      {/* Keine Ergebnisse */}
      {!loading && visibleUsers.length === 0 && (
        <div className="alert alert-secondary text-center" role="alert">
          Keine Benutzer gefunden.
        </div>
      )}

      {/* Ergebnis-Anzahl */}
      {!loading && visibleUsers.length > 0 && (
        <p className="text-body-secondary small mb-2">{visibleUsers.length} Benutzer gefunden</p>
      )}

      {/* User-Cards */}
      <div className="raster-auto abstand-3">
        {visibleUsers.map(currentUser => {
          const isSelfRow = user?.userName === currentUser.userName;
          const edit = edits[currentUser._id] ?? buildEditState(currentUser);
          const isSaving = savingUserId === currentUser._id;
          const isExpanded = expandedUserId === currentUser._id;
          const changed = hasChanges(currentUser._id);
          const roleInfo = ROLE_LABELS[currentUser.role];
          const editable = canEdit() && !isSelfRow;

          return (
            <div key={currentUser._id} className="">
              <div className={`card h-100 ${isSelfRow ? 'border-primary' : ''} ${changed ? 'border-warning' : ''}`}>
                {/* Card Header */}
                <div
                  className="card-header d-flex justify-content-between align-items-center py-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedUserId(isExpanded ? null : currentUser._id)}
                >
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    <span className="db-icon text-body-secondary db-font-size-md" data-icon="person" />
                    <span className="fw-semibold text-truncate">{currentUser.userName}</span>
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
                        onChange={e =>
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
                    <div className="mb-3">
                      <label className="form-label fw-semibold small mb-1">OE</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={edit.oe}
                        onChange={e => updateEdit(currentUser._id, { oe: (e.target as HTMLInputElement).value })}
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
                    <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
                      {editable && (
                        <>
                          <button
                            className="btn btn-primary btn-sm flex-grow-1"
                            onClick={() => handleSave(currentUser._id)}
                            disabled={!changed || isSaving}
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
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleResetEdit(currentUser._id)}
                              disabled={isSaving}
                              title="Änderungen verwerfen"
                            >
                              <span
                                className="db-icon db-font-size-sm"
                                data-icon="undo"
                                style={{ verticalAlign: 'middle' }}
                              />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        className="btn btn-outline-secondary btn-sm flex-grow-1"
                        onClick={() => handleLoadAsUser(currentUser._id)}
                        disabled={isSaving}
                      >
                        <span
                          className="db-icon me-1 db-font-size-sm"
                          data-icon={isSelfRow ? 'house' : 'eye'}
                          style={{ verticalAlign: 'middle' }}
                        />
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
