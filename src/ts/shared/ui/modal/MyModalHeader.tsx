import { DBButton, DBHeadingH2, DBTooltip } from '@db-ux/react-core-components';
import { useEffect, useId, useRef, type FC } from 'react';

import type { HelpContextKey } from '@/shared/lib/help/helpContent';
import { openHelpModal } from '@/widgets/help-modal/openHelpModal';

/**
 * Kopfzeile der Dialoge im DB-Drawer-Aufbau: Titel links, Aktionen rechts. Der
 * Schliessen-Knopf traegt beide Marker -- `data-action="close"` fuer den Drawer selbst und
 * `data-dialog-dismiss="modal"` fuer die Delegation aus `showModal.tsx`.
 *
 * Verknuepft den umschliessenden `<dialog>` per `aria-labelledby` mit der Ueberschrift (wie
 * `DBDrawerHeader` es taete) -- `showModal` reicht den Header im `children`-Slot durch, nicht
 * ueber die `header`-Prop von `DBDrawer`, deshalb hier von Hand.
 *
 * Props: `title` (Dialogtitel) und optional `helpContext` (blendet den Hilfe-Knopf ein).
 */
const MyModalHeader: FC<{ title: string; helpContext?: HelpContextKey }> = ({ title, helpContext }) => {
  const ueberschriftId = `dialog-titel-${useId()}`;
  const kopfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = kopfRef.current?.closest('dialog');
    if (!dialog) return;
    dialog.setAttribute('aria-labelledby', ueberschriftId);
    return () => {
      if (dialog.getAttribute('aria-labelledby') === ueberschriftId) dialog.removeAttribute('aria-labelledby');
    };
  }, [ueberschriftId]);

  return (
    <div className="db-drawer-header" ref={kopfRef}>
      <header className="db-drawer-header-container">
        <DBHeadingH2 paragraphSpacing id={ueberschriftId}>
          {title}
        </DBHeadingH2>
      </header>
      {helpContext && (
        <DBButton
          type="button"
          variant="ghost"
          icon="question_mark_circle"
          noText
          aria-label="Hilfe anzeigen"
          onClick={() => openHelpModal(helpContext)}
        >
          <DBTooltip>Hilfe anzeigen</DBTooltip>
        </DBButton>
      )}
      <DBButton
        type="button"
        variant="ghost"
        icon="cross"
        noText
        aria-label="Schließen"
        data-action="close"
        data-dialog-dismiss="modal"
      >
        <DBTooltip>Schließen</DBTooltip>
      </DBButton>
    </div>
  );
};
export default MyModalHeader;
