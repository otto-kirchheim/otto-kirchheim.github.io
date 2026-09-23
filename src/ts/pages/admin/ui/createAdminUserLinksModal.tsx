import { showModal } from '@/components';
import { AdminUserLinksModal } from './AdminUserLinksModal';

/**
 * Öffnet den Dialog zum Erzeugen von Links (Verifizierung/Passwort-Reset) für einen Benutzer.
 *
 * @param userId - Id des Benutzers.
 * @param userName - Anzeigename im Dialog.
 * @param emailVerified - Bei `true` ist kein Verifizierungslink nötig.
 */
export default function createAdminUserLinksModal(userId: string, userName: string, emailVerified: boolean): void {
  showModal(<AdminUserLinksModal userId={userId} userName={userName} emailVerified={emailVerified} />);
}
