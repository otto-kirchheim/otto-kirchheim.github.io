import { useState } from 'react';

import { joinOeLevels } from '@/shared/lib/ressource/oeLevels';
import { useDebouncedValue, matchesOeQuery } from '../model/adminUserListHelpers';
import type { AdminUserRow } from '../api/api';
import { DBButton, DBTooltip, DBStack } from '@db-ux/react-core-components';
import { DbFeld } from '@/shared/ui/form/DbFeld';

/**
 * Übersichtstabelle der für die Massenänderung ausgewählten Benutzer mit aktuellen Werten.
 * Ab mehr als 5 Benutzern erscheint ein Filter nach Name oder OE.
 *
 * @param props - `selectedUsers` (Auswahl) und `onRemoveUser` (nimmt einen Benutzer aus der Auswahl).
 */
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
    <div className="luft-unten-sm">
      <DBStack direction="row" gap="none" alignment="center" justifyContent="space-between" className="luft-unten-2xs">
        <span className="fett zelle-klein">Ausgewählte Benutzer ({selectedUsers.length})</span>
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
      </DBStack>
      <div className="db-table" data-width="full" data-size="small" data-divider="both" style={{ maxHeight: '30vh' }}>
        <table className="ohne-luft-unten">
          <thead className="tabellenkopf-fix">
            <tr>
              <th scope="col">Benutzer</th>
              <th scope="col">OE</th>
              <th scope="col">Betrieb</th>
              <th scope="col" className="zelle-rechts">
                <span className="nur-screenreader">Abwählen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map(user => (
              <tr key={user._id}>
                <td>{user.fullName || user.userName}</td>
                <td>{joinOeLevels(user.oe) || '–'}</td>
                <td>{user.betrieb || '–'}</td>
                <td className="zelle-rechts">
                  <DBButton
                    type="button"
                    className="farbe-gefahr"
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
                <td colSpan={4} className="farbe-gedaempft kursiv">
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
