import { type FC } from 'react';

import type { HelpContextKey } from '@/core/help/helpContent';
import { openHelpModal } from '@/core/help/openHelpModal';

/**
 * Kopfzeile der Dialoge im DB-Drawer-Aufbau: Titel links, Aktionen rechts. Der
 * Schliessen-Knopf traegt beide Marker -- `data-action="close"` fuer den Drawer selbst und
 * `data-bs-dismiss="modal"` fuer die Delegation aus `showModal.tsx`.
 */
const MyModalHeader: FC<{ title: string; helpContext?: HelpContextKey }> = ({ title, helpContext }) => {
  return (
    <div className="db-drawer-header modal-header">
      <header className="db-drawer-header-container">
        <h2 className="modal-title">{title}</h2>
      </header>
      {helpContext && (
        <button
          type="button"
          className="db-button"
          data-variant="ghost"
          data-icon="question_mark_circle"
          data-no-text="true"
          onClick={() => openHelpModal(helpContext)}
        >
          Hilfe anzeigen
        </button>
      )}
      <button
        type="button"
        className="db-button"
        data-variant="ghost"
        data-icon="cross"
        data-no-text="true"
        data-action="close"
        data-bs-dismiss="modal"
      >
        Schließen
      </button>
    </div>
  );
};
export default MyModalHeader;
