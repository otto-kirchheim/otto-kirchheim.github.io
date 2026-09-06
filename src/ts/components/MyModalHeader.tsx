import { type FC } from 'react';

import type { HelpContextKey } from '@/core/help/helpContent';
import { openHelpModal } from '@/core/help/openHelpModal';

const MyModalHeader: FC<{ title: string; helpContext?: HelpContextKey }> = ({ title, helpContext }) => {
  return (
    <div className="modal-header">
      <h5 className="modal-title">{title}</h5>
      {helpContext && (
        <button
          type="button"
          className="btn btn-sm btn-link me-1 p-0"
          aria-label="Hilfe anzeigen"
          onClick={() => openHelpModal(helpContext)}
        >
          <span className="db-icon align-middle db-font-size-md" data-icon="question_mark_circle" />
        </button>
      )}
      <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
    </div>
  );
};
export default MyModalHeader;
