import { unmount } from '@/infrastructure/ui';

import { DBButton, DBHeadingH5, DBTooltip } from '@db-ux/react-core-components';
import { oeffneDrawer } from '@/components';
import { PlatzhalterHilfeInhalt } from './PlatzhalterHilfeInhalt';

/**
 * Öffnet die Platzhalter-Hilfe in einem eigenständigen, dynamisch erzeugten Drawer statt im
 * geteilten `#modal`-Element (wie `openHelpModal.tsx`): der FormularEditor läuft schon in einem
 * Admin-Tab, ein zweiter Dialog darf einen gerade offenen nicht verdrängen. Beim Schließen wird der
 * Container wieder entfernt.
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
