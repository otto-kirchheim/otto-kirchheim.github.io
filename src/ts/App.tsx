import AppHeader from '@/infrastructure/ui/AppHeader';
import AppFooter from '@/infrastructure/ui/AppFooter';
import StartTab from '@/infrastructure/ui/StartTab';
import BerechnungTab from '@/infrastructure/ui/BerechnungTab';
import EinstellungenTab from '@/infrastructure/ui/EinstellungenTab';
import useActiveTab from '@/infrastructure/ui/useActiveTab';

/**
 * App-Shell, ein einziger React-Baum (Phase N, Slice 1). Bildet die vormalige
 * `index.html`-Body-Struktur 1:1 nach -- identische `id`/`class`-Attribute, damit
 * `tabController`, `autoSave`, `featureLifecycleRegistry`/`syncFeatureTabs` und der
 * Admin-Sichtbarkeits-Toggle ihre Elemente weiterhin per `querySelector` finden (bewaehrtes
 * Phase-L-Muster fuer `#start`/`#Berechnung`/`#Einstellungen`, jetzt auf die ganze Shell
 * ausgeweitet). `#modal` und die leeren Feature-Root-Divs (`bereitschaft-root` etc.) bleiben
 * leer -- `showModal`/`featureLifecycleRegistry` mounten dort weiterhin selbst per `mount()`.
 *
 * Seit Phase N Slice 2 berechnen die `#tabContent`-Panes ihre `active`/`show`-Klassen selbst aus
 * `activeTabStore` (`useActiveTab()`) -- `tabController.ts`s `zeigeTab()` schreibt fuer diese
 * Hauptgruppe keine DOM-Klassen mehr, siehe dortiger Kommentar. `null` (Store-Anfangswert) heisst
 * "start" ist aktiv, identisch zum vormals hartkodierten `fade show active` auf `#start`.
 */
export default function App() {
  const aktiverTab = useActiveTab() ?? 'start';
  const paneKlasse = (id: string): string => `tab-pane fade${aktiverTab === id ? ' show active' : ''}`;

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
        <div className={paneKlasse('start')} id="start" role="tabpanel">
          <StartTab />
        </div>

        <div className={paneKlasse('Bereitschaft')} id="Bereitschaft" role="tabpanel">
          <div id="bereitschaft-root"></div>
        </div>

        <div className={paneKlasse('EWT')} id="EWT" role="tabpanel">
          <div id="ewt-root"></div>
        </div>

        <div className={paneKlasse('Neben')} id="Neben" role="tabpanel">
          <div id="neben-root"></div>
        </div>

        <div className={paneKlasse('EA')} id="EA" role="tabpanel">
          <div id="ea-root"></div>
        </div>

        <div className={paneKlasse('Berechnung')} id="Berechnung" role="tabpanel">
          <BerechnungTab />
        </div>

        <div className={paneKlasse('Admin')} id="Admin" role="tabpanel">
          <div className="breit px-3 px-md-4 mb-3">
            <div id="admin-root"></div>
          </div>
        </div>

        <div className={paneKlasse('Einstellungen')} id="Einstellungen" role="tabpanel">
          <EinstellungenTab />
        </div>
      </div>

      <AppFooter startYear={2021} />
    </>
  );
}
