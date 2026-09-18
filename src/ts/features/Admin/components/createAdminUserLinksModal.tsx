import { showModal } from '@/components';
import { AdminUserLinksModal } from './AdminUserLinksModal';

export default function createAdminUserLinksModal(userId: string, userName: string, emailVerified: boolean): void {
  showModal(<AdminUserLinksModal userId={userId} userName={userName} emailVerified={emailVerified} />);
}
