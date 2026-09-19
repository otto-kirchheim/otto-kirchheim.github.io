import { unmount } from '@/infrastructure/ui';

import { DBButton, DBHeadingH5, DBTooltip } from '@db-ux/react-core-components';
import { oeffneDrawer } from '@/components';
import { PlatzhalterHilfeInhalt } from './PlatzhalterHilfeInhalt';

/**
 * Eigenständiges, dynamisch erzeugtes Modal statt des geteilten `#modal`-Elements (siehe
 * `openHelpModal.tsx`) -- der FormularEditor läuft selbst schon in einem Admin-Tab, ein zweites
 * Modal darf ein eventuell gerade offenes nicht verdrängen.
 */
export function openPlatzhalterHilfe(): void {
  const container = document.createElement('div');
  document.body.appendChild(container);

  oeffneDrawer(
    container,
    <div className="dialog-rumpf" data-breite="lg">
      <div className="db-drawer-header">
        <DBHeadingH5 paragraphSpacing>Platzhalter &amp; Formate</DBHeadingH5>
        <DBButton type="button" icon="cross" variant="ghost" noText data-dialog-dismiss="modal">
          <DBTooltip>Schließen</DBTooltip>
        </DBButton>
      </div>
      <div className="dialog-koerper">
        <PlatzhalterHilfeInhalt />
      </div>
    </div>,
    () => {
      unmount(container);
      container.remove();
    },
  );
}
