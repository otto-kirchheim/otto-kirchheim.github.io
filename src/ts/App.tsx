import { DBButton, DBNotification, DBShell, DBShellContent } from '@db-ux/react-core-components';
import AppHeader from '@/infrastructure/ui/AppHeader';
import AppFooter from '@/infrastructure/ui/AppFooter';
import SnackbarHost from '@/infrastructure/ui/SnackbarHost';
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
 *
 * Header-Umbau (DBHeader -> DB UX Shell): `<DBShell>` umschliesst `AppHeader` (liefert die
 * beiden Control-Panels, kein eigenes `DBShell`, siehe dort) UND `<DBShellContent>` --
 * `DBShell`s CSS-Grid braucht beide als direkte Geschwister. `AppFooter`/`SnackbarHost` bleiben
 * bewusst AUSSERHALB von `DBShellContent` (eigene `position: fixed/absolute`-Overlays,
 * unabhaengig vom Content-Scroll) -- `SnackbarHost` rendert seine Container ohnehin per
 * `createPortal` direkt in `document.body`, die Position im Baum hier ist nur Konvention.
 */
export default function App() {
  const aktiverTab = useActiveTab() ?? 'start';
  const paneKlasse = (id: string): string => `tab-pane fade${aktiverTab === id ? ' show active' : ''}`;

  return (
    <DBShell>
      <AppHeader />

      <DBShellContent>
        <div id="modal"></div>

        <div className="breit px-2 px-md-3 mt-2">
          <DBNotification
            id="actAsNotice"
            semantic="warning"
            variant="standalone"
            icon="eye"
            role="status"
            ariaLive="polite"
            className="shadow-sm d-none mb-0"
          >
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3">
              <div>
                <div className="fw-semibold">Fremde Benutzerdaten aktiv</div>
                <div className="small" id="actAsNoticeText"></div>
              </div>
              <div className="d-grid d-sm-flex gap-2">
                <DBButton variant="filled" data-color="warning" size="small" id="actAsOwnDataButton" type="button">
                  Eigene Daten laden
                </DBButton>
              </div>
            </div>
          </DBNotification>
        </div>

        <div id="conflictReviewBannerMount"></div>

        {/* `mt-3` (Abstand zur Kopfzeile) nur ausserhalb Start: `.mt-3` nutzt DB-UXs eigenes
            `!important` -- ein CSS-Gegenrule in `styles.scss` (unlayered, sonst hoechste
            Prioritaet) kann das NICHT schlagen, `!important` kehrt die Cascade-Layer-Reihenfolge
            um. Start reicht per `min-block-size` exakt bis zur Fusszeile (siehe `#start.active`
            unten) -- mit `mt-3` ragte Start um genau diese 12px unter die Fusszeile (User-Fund,
            Puppeteer-gemessen `startRect.bottom` vs. `footerRect.top`). */}
        <div className={`tab-content${aktiverTab === 'start' ? '' : ' mt-3'}`} id="tabContent">
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
      </DBShellContent>

      <AppFooter startYear={2021} />
      <SnackbarHost />
    </DBShell>
  );
}
