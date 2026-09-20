import { schliesseModal, showModal } from '@/components';
import type { AdminUserRow } from '../utils/api';
import { AdminBulkEditModal } from './AdminBulkEditModal';

/**
 * Öffnet den Dialog zur Massenbearbeitung der ausgewählten Benutzer.
 *
 * @param selectedUsers - Startauswahl der Benutzer.
 * @param onApplied - Wird nach erfolgreichem Speichern aufgerufen.
 */
export default function createAdminBulkEditModal(selectedUsers: AdminUserRow[], onApplied: () => void): void {
  showModal(
    <AdminBulkEditModal selectedUsers={selectedUsers} onApplied={onApplied} closeModal={() => schliesseModal()} />,
  );
}
