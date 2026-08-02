import { useState } from 'preact/hooks';
import { joinOeLevels } from '@/infrastructure/data/oeLevels';
import { useDebouncedValue, matchesOeQuery } from '../utils/adminUserListHelpers';
import type { AdminUserRow } from '../utils/api';

/** Übersichtstabelle der für die Massenänderung ausgewählten Benutzer mit aktuellen Werten. */
export function BulkEditUserOverview({
  selectedUsers,
  onRemoveUser,
}: {
  selectedUsers: AdminUserRow[];
  onRemoveUser: (userId: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebouncedValue(filter, 150);

  const query = debouncedFilter.trim().toLowerCase();
  const visibleUsers = query
    ? selectedUsers.filter(user => {
        const name = (user.fullName || user.userName).toLowerCase();
        return name.includes(query) || matchesOeQuery(debouncedFilter, [joinOeLevels(user.oe)]);
      })
    : selectedUsers;

  return (
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-semibold small">Ausgewählte Benutzer ({selectedUsers.length})</span>
        {selectedUsers.length > 5 && (
          <input
            type="search"
            class="form-control form-control-sm"
            style="max-width: 14rem"
            placeholder="Name oder OE filtern…"
            aria-label="Ausgewählte Benutzer filtern"
            value={filter}
            onInput={e => setFilter((e.target as HTMLInputElement).value)}
          />
        )}
      </div>
      <div class="table-responsive border rounded" style="max-height:30vh">
        <table class="table table-sm mb-0 align-middle">
          <thead class="sticky-top bg-body">
            <tr>
              <th scope="col">Benutzer</th>
              <th scope="col">OE</th>
              <th scope="col">Betrieb</th>
              <th scope="col" class="text-end">
                <span class="visually-hidden">Abwählen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map(user => (
              <tr key={user._id}>
                <td>{user.fullName || user.userName}</td>
                <td>{joinOeLevels(user.oe) || '–'}</td>
                <td>{user.betrieb || '–'}</td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-link text-danger p-0"
                    aria-label={`${user.fullName || user.userName} abwählen`}
                    disabled={selectedUsers.length <= 1}
                    onClick={() => onRemoveUser(user._id)}
                  >
                    <span class="material-icons-round" style="font-size: 1.1rem; vertical-align: middle">
                      close
                    </span>
                  </button>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={4} class="text-body-secondary fst-italic">
                  Keine Treffer
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
