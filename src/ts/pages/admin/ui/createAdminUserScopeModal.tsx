import showModal, { schliesseModal } from '@/shared/ui/modal/showModal';
import { AdminUserScopeModal, type ScopeEntwurf } from './AdminUserScopeModal';

/**
 * Öffnet den Dialog für Rolle, OE und Zuständigkeiten eines Benutzers.
 *
 * @param userName - Anzeigename im Dialogtitel.
 * @param start - Bearbeitungsstand der Karte beim Öffnen.
 * @param roleEditable - Ob die Rolle geändert werden darf.
 * @param onApply - Übernimmt den Entwurf in den Bearbeitungsstand der Karte.
 */
export default function createAdminUserScopeModal(
  userName: string,
  start: ScopeEntwurf,
  roleEditable: boolean,
  onApply: (entwurf: ScopeEntwurf) => void,
): void {
  showModal(
    <AdminUserScopeModal
      userName={userName}
      start={start}
      roleEditable={roleEditable}
      onApply={onApply}
      closeModal={() => schliesseModal()}
    />,
  );
}
