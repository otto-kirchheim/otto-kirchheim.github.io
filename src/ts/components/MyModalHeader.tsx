import type { FunctionalComponent } from 'preact';
import type { HelpContextKey } from '@/core/help/helpContent';
import { openHelpModal } from '@/core/help/openHelpModal';

const MyModalHeader: FunctionalComponent<{ title: string; helpContext?: HelpContextKey }> = ({
  title,
  helpContext,
}) => {
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
          <span className="material-icons-round align-middle" style="font-size:1.25rem">
            help_outline
          </span>
        </button>
      )}
      <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
    </div>
  );
};
export default MyModalHeader;
