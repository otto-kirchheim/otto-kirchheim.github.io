import type { FunctionalComponent } from 'preact';
import type { HelpContent } from '@/core/help/helpContent';
import { openOnboardingGuide } from '@/core/orchestration/onboarding/createOnboardingGuideModal';
import { MyDivModal, MyModalBody } from '.';

const MyHelpModal: FunctionalComponent<{ content: HelpContent }> = ({ content }) => (
  <MyDivModal
    title={content.title}
    Footer={
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
          Schließen
        </button>
      </div>
    }
  >
    <MyModalBody className="d-flex flex-column gap-3">
      <p className="mb-0">{content.kurzbeschreibung}</p>

      <div>
        <h6>Was kann ich hier machen?</h6>
        <ul className="mb-0">
          {content.wasKannIchHierMachen.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {content.buttons && (
        <div>
          <h6>Wofür sind die Buttons?</h6>
          <ul className="mb-0">
            {content.buttons.map(button => (
              <li key={button.label}>
                <strong>{button.label}:</strong> {button.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.felder && (
        <div>
          <h6>Eingabehilfe</h6>
          <ul className="mb-0">
            {content.felder.map(feld => (
              <li key={feld.label}>
                <strong>{feld.label}:</strong> {feld.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.schritte && (
        <div>
          <h6>Schritte</h6>
          <ol className="mb-0">
            {content.schritte.map(schritt => (
              <li key={schritt}>{schritt}</li>
            ))}
          </ol>
        </div>
      )}

      {content.eingaberegeln && (
        <div>
          <h6>Eingaberegeln</h6>
          <ul className="mb-0">
            {content.eingaberegeln.map(regel => (
              <li key={regel}>{regel}</li>
            ))}
          </ul>
        </div>
      )}

      {content.haeufigeFehler && (
        <div>
          <h6>Häufige Fehler</h6>
          <ul className="mb-0">
            {content.haeufigeFehler.map(fehler => (
              <li key={fehler}>{fehler}</li>
            ))}
          </ul>
        </div>
      )}

      {content.tipp && (
        <div className="alert alert-info mb-0 py-2" role="alert">
          <span className="material-icons-round align-middle me-1" style="font-size:1rem">
            lightbulb
          </span>
          {content.tipp}
        </div>
      )}

      {content.reopenOnboardingAction && (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm align-self-start"
          data-bs-dismiss="modal"
          onClick={() => openOnboardingGuide()}
        >
          <span className="material-icons-round align-middle me-1" style="font-size:1rem">
            replay
          </span>
          Ersteinrichtung erneut öffnen
        </button>
      )}
    </MyModalBody>
  </MyDivModal>
);

export default MyHelpModal;
