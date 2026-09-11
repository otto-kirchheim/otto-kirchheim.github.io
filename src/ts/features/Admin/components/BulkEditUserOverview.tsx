import { useState } from 'react';

import { joinOeLevels } from '@/infrastructure/data/oeLevels';
import { useDebouncedValue, matchesOeQuery } from '../utils/adminUserListHelpers';
import type { AdminUserRow } from '../utils/api';
import { DBButton, DBTooltip } from '@db-ux/react-core-components';
import { DbFeld } from '@/components';

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
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="fw-semibold small">Ausgewählte Benutzer ({selectedUsers.length})</span>
        {selectedUsers.length > 5 && (
          <DbFeld
            beschriftung="Ausgewählte Benutzer filtern"
            dicht
            type="search"
            huelleStyle={{ maxWidth: '14rem' }}
            placeholder="Name oder OE filtern…"
            value={filter}
            onChange={e => setFilter((e.target as HTMLInputElement).value)}
          />
        )}
      </div>
      <div className="db-table" data-width="full" data-size="small" data-divider="both" style={{ maxHeight: '30vh' }}>
        <table className="align-middle mb-0">
          <thead className="sticky-top bg-body">
            <tr>
              <th scope="col">Benutzer</th>
              <th scope="col">OE</th>
              <th scope="col">Betrieb</th>
              <th scope="col" className="text-end">
                <span className="visually-hidden">Abwählen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map(user => (
              <tr key={user._id}>
                <td>{user.fullName || user.userName}</td>
                <td>{joinOeLevels(user.oe) || '–'}</td>
                <td>{user.betrieb || '–'}</td>
                <td className="text-end">
                  <DBButton
                    type="button"
                    className="text-danger p-0"
                    variant="ghost"
                    size="small"
                    icon="cross"
                    noText
                    disabled={selectedUsers.length <= 1}
                    onClick={() => onRemoveUser(user._id)}
                  >
                    <DBTooltip>{`${user.fullName || user.userName} abwählen`}</DBTooltip>
                  </DBButton>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-body-secondary fst-italic">
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
