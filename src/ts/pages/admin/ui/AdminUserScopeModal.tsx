import { useState } from 'react';
import { DBButton, DBInfotext } from '@db-ux/react-core-components';

import type { TUserRole } from '@/types';
import { splitOeInput } from '@/shared/lib/ressource/oeLevels';
import { DbAuswahl } from '@/shared/ui/form/DbFeld';
import MyDialogFooter from '@/shared/ui/modal/MyDialogFooter';
import MyDivModal from '@/shared/ui/modal/MyDivModal';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import { OeLevelBoxes } from './OeLevelBoxes';
import { OeTagInput } from './OeTagInput';
import { StuetzpunktTagInput } from './StuetzpunktTagInput';
import { sichtbareBloecke, type UserEditState } from './adminUserListTypen';

export type ScopeEntwurf = Pick<
  UserEditState,
  'role' | 'oe' | 'adminForTeamOes' | 'adminForStuetzpunkte' | 'adminForOrganizationOes'
>;

type Props = {
  userName: string;
  start: ScopeEntwurf;
  roleEditable: boolean;
  onApply: (entwurf: ScopeEntwurf) => void;
  closeModal: () => void;
};

/**
 * Dialog zum Ändern von Rolle, OE und Zuständigkeiten eines Benutzers. Läuft in einem eigenen
 * React-Root (`showModal`) und arbeitet deshalb auf einem lokalen Entwurf; "Übernehmen" reicht ihn
 * an den Bearbeitungsstand der Karte weiter -- gespeichert wird erst dort mit "Speichern".
 *
 * @param props - `userName` (Titel), `start` (Bearbeitungsstand beim Öffnen), `roleEditable`,
 *   `onApply` (übernimmt den Entwurf) und `closeModal`.
 */
export function AdminUserScopeModal({ userName, start, roleEditable, onApply, closeModal }: Props) {
  const [entwurf, setEntwurf] = useState<ScopeEntwurf>(start);
  const zeige = sichtbareBloecke(entwurf.role);

  function aendere(patch: Partial<ScopeEntwurf>): void {
    setEntwurf(vorher => ({ ...vorher, ...patch }));
  }

  const footer = (
    <MyDialogFooter>
      <DBButton
        type="button"
        variant="brand"
        onClick={() => {
          onApply(entwurf);
          closeModal();
        }}
      >
        Übernehmen
      </DBButton>
      <DBButton type="button" variant="filled" data-dialog-dismiss="modal">
        Abbrechen
      </DBButton>
    </MyDialogFooter>
  );

  return (
    <MyDivModal title={`Rolle & Zuständigkeiten: ${userName}`} Footer={footer}>
      <MyModalBody>
        <div className="sp-12">
          <DbAuswahl
            beschriftung="Rolle"
            beschriftungZeigen
            dicht
            value={entwurf.role}
            onChange={e => aendere({ role: (e.target as HTMLSelectElement).value as TUserRole })}
            disabled={!roleEditable}
          >
            <option value="member">Mitglied</option>
            <option value="team-admin">Team-Admin</option>
            <option value="org-admin">Org-Admin</option>
            <option value="super-admin">Super-Admin</option>
          </DbAuswahl>
        </div>

        <div className="sp-12">
          <label className="admin-label">OE</label>
          <OeLevelBoxes value={entwurf.oe} onChange={oe => aendere({ oe })} />
        </div>

        {zeige.team && (
          <div className="sp-12">
            <OeTagInput
              label="Team-Admin OEs"
              values={entwurf.adminForTeamOes}
              onChange={adminForTeamOes => aendere({ adminForTeamOes })}
              placeholder="Team-OE hinzufügen…"
              defaultLevelCount={splitOeInput(entwurf.oe).length}
            />
          </div>
        )}

        {zeige.team && (
          <div className="sp-12">
            <StuetzpunktTagInput
              label="Team-Admin Stützpunkte (zusätzlich zu den OEs; ohne Team-OE wirkungslos)"
              values={entwurf.adminForStuetzpunkte}
              onChange={adminForStuetzpunkte => aendere({ adminForStuetzpunkte })}
            />
          </div>
        )}

        {zeige.org && (
          <div className="sp-12">
            <OeTagInput
              label="Org-Admin OEs"
              values={entwurf.adminForOrganizationOes}
              onChange={adminForOrganizationOes => aendere({ adminForOrganizationOes })}
              placeholder="Org-OE hinzufügen…"
              defaultLevelCount={splitOeInput(entwurf.oe).length}
            />
          </div>
        )}

        <div className="sp-12">
          <DBInfotext showIcon={false} className="infotext-block">
            Übernommene Änderungen werden erst mit „Speichern“ in der Benutzerkarte gesichert.
          </DBInfotext>
        </div>
      </MyModalBody>
    </MyDivModal>
  );
}
