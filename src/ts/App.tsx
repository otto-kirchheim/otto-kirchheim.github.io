import { DBButton, DBNotification, DBShell, DBShellContent } from '@db-ux/react-core-components';
import { featureRegistry } from '@/shared/lib/feature';
import AppHeader from '@/infrastructure/ui/AppHeader';
import AppFooter from '@/infrastructure/ui/AppFooter';
import SnackbarHost from '@/infrastructure/ui/SnackbarHost';
import StartTab from '@/infrastructure/ui/StartTab';
import BerechnungTab from '@/infrastructure/ui/BerechnungTab';
import EinstellungenTab from '@/infrastructure/ui/EinstellungenTab';
import useActiveTab from '@/infrastructure/ui/useActiveTab';

/**
 * App-Shell als ein einziger React-Baum. Die `id`/`class`-Attribute der Panes und Mount-Divs
 * bleiben stabil, damit `tabController`, `autoSave`, `featureLifecycleRegistry`/`syncFeatureTabs`
 * und der Admin-Sichtbarkeits-Toggle ihre Elemente per `querySelector` finden. `#modal` und die
 * leeren Feature-Root-Divs (`bereitschaft-root` etc.) bleiben leer -- `showModal` und
 * `featureLifecycleRegistry` mounten dort selbst per `mount()`.
 *
 * Die `#tabContent`-Panes berechnen `active`/`show` selbst aus `activeTabStore`
 * (`useActiveTab()`); `tabController.zeigeTab()` schreibt fuer diese Hauptgruppe keine
 * DOM-Klassen. `null` (Store-Anfangswert) heisst: "start" ist aktiv.
 *
 * `<DBShell>` umschliesst `AppHeader` (liefert die beiden Control-Panels, kein eigenes `DBShell`)
 * UND `<DBShellContent>`, weil sein CSS-Grid beide als direkte Geschwister braucht.
 * `AppFooter`/`SnackbarHost` stehen bewusst AUSSERHALB von `DBShellContent` (eigene fixed/absolute
 * Overlays, unabhaengig vom Content-Scroll); `SnackbarHost` rendert per `createPortal` in
 * `document.body`, die Position im Baum ist nur Konvention.
 */
export default function App() {
  const aktiverTab = useActiveTab() ?? 'start';
  /**
   * CSS-Klassen einer Tab-Pane: `show active` nur, wenn `id` der aktive Tab ist.
   *
   * @param id - Panel-Id (`#start`, `#Berechnung`, ...).
   * @returns Klassenstring der Pane.
   */
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

        {/* `mt-3` (Abstand zur Kopfzeile) nur ausserhalb Start: die Klasse ist `!important`
            (`utilities.scss`), eine unlayered Gegenregel in `styles.scss` schlaegt sie nicht --
            bei `!important` kehrt sich die Layer-Rangfolge um. Start reicht per `min-block-size`
            exakt bis zur Fusszeile (`#start.active`); mit `mt-3` ragte es darunter. */}
        <div className={`tab-content${aktiverTab === 'start' ? '' : ' mt-3'}`} id="tabContent">
          <div className={paneKlasse('start')} id="start" role="tabpanel">
            <StartTab />
          </div>

          {featureRegistry.metas().map(({ legacy }) => (
            <div className={paneKlasse(legacy.paneId)} id={legacy.paneId} role="tabpanel" key={legacy.paneId}>
              <div id={legacy.rootId}></div>
            </div>
          ))}

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
