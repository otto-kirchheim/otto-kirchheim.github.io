import AppHeader from '@/infrastructure/ui/AppHeader';
import AppFooter from '@/infrastructure/ui/AppFooter';
import StartTab from '@/infrastructure/ui/StartTab';
import BerechnungTab from '@/infrastructure/ui/BerechnungTab';
import EinstellungenTab from '@/infrastructure/ui/EinstellungenTab';

/**
 * App-Shell, ein einziger React-Baum (Phase N, Slice 1). Bildet die vormalige
 * `index.html`-Body-Struktur 1:1 nach -- identische `id`/`class`-Attribute, damit
 * `tabController`, `autoSave`, `featureLifecycleRegistry`/`syncFeatureTabs` und der
 * Admin-Sichtbarkeits-Toggle ihre Elemente weiterhin per `querySelector` finden (bewaehrtes
 * Phase-L-Muster fuer `#start`/`#Berechnung`/`#Einstellungen`, jetzt auf die ganze Shell
 * ausgeweitet). `#modal` und die leeren Feature-Root-Divs (`bereitschaft-root` etc.) bleiben
 * leer -- `showModal`/`featureLifecycleRegistry` mounten dort weiterhin selbst per `mount()`.
 */
export default function App() {
  return (
    <>
      <AppHeader />

      <div id="modal"></div>

      <div className="breit px-2 px-md-3 mt-2">
        <div
          className="db-notification shadow-sm d-none mb-0"
          data-semantic="warning"
          data-variant="standalone"
          id="actAsNotice"
          role="status"
          aria-live="polite"
        >
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3">
            <div className="d-flex align-items-start gap-2">
              <span className="db-icon mt-1 mt-md-0" data-icon="eye"></span>
              <div>
                <div className="fw-semibold">Fremde Benutzerdaten aktiv</div>
                <div className="small" id="actAsNoticeText"></div>
              </div>
            </div>
            <div className="d-grid d-sm-flex gap-2">
              <button
                className="db-button"
                data-variant="filled"
                data-color="warning"
                data-size="small"
                id="actAsOwnDataButton"
                type="button"
              >
                Eigene Daten laden
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="conflictReviewBannerMount"></div>

      <div className="tab-content mt-1" id="tabContent">
        {/* Tab Start -- kein Wrapper-Div: `styles.scss` verankert `.schwelle` per
            `#start.active > .schwelle`-Kindselektor. */}
        <div className="tab-pane fade show active" id="start" role="tabpanel">
          <StartTab />
        </div>

        <div className="tab-pane fade" id="Bereitschaft" role="tabpanel">
          <div id="bereitschaft-root"></div>
        </div>

        <div className="tab-pane fade" id="EWT" role="tabpanel">
          <div id="ewt-root"></div>
        </div>

        <div className="tab-pane fade" id="Neben" role="tabpanel">
          <div id="neben-root"></div>
        </div>

        <div className="tab-pane fade" id="EA" role="tabpanel">
          <div id="ea-root"></div>
        </div>

        <div className="tab-pane fade" id="Berechnung" role="tabpanel">
          <BerechnungTab />
        </div>

        <div className="tab-pane fade" id="Admin" role="tabpanel">
          <div className="breit px-3 px-md-4 mb-3">
            <div id="admin-root"></div>
          </div>
        </div>

        <div className="tab-pane fade" id="Einstellungen" role="tabpanel">
          <EinstellungenTab />
        </div>
      </div>

      <AppFooter startYear={2021} />
    </>
  );
}
