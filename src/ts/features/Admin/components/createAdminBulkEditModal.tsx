import { schliesseModal, showModal } from '@/components';
import type { AdminUserRow } from '../utils/api';
import { AdminBulkEditModal } from './AdminBulkEditModal';

export default function createAdminBulkEditModal(selectedUsers: AdminUserRow[], onApplied: () => void): void {
  showModal(
    <AdminBulkEditModal selectedUsers={selectedUsers} onApplied={onApplied} closeModal={() => schliesseModal()} />,
  );
}
