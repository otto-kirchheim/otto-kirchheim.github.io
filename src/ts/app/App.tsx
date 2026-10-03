import { DBButton, DBNotification, DBShell, DBShellContent, DBStack } from '@db-ux/react-core-components';
import { featureRegistry } from '@/shared/lib/feature';
import AppHeader from '@/widgets/app-header/AppHeader';
import AppFooter from '@/widgets/app-footer/AppFooter';
import SnackbarHost from '@/shared/ui/snackbar/SnackbarHost';
import StartTab from '@/pages/start/ui/StartTab';
import BerechnungTab from '@/pages/berechnung/ui/BerechnungTab';
import EinstellungenTab from '@/pages/einstellungen/ui/EinstellungenTab';
import useActiveTab from '@/shared/model/navigation/useActiveTab';

/**
 * App-Shell als ein einziger React-Baum. Die `id`/`class`-Attribute der Panes und Mount-Divs
 * bleiben stabil, damit `tabController`, `autoSave`, `featureLifecycleRegistry`/`syncFeatureTabs`
 * und der Admin-Sichtbarkeits-Toggle ihre Elemente per `querySelector` finden. `#modal` und die
 * leeren Feature-Root-Divs (`bereitschaft-root` etc.) bleiben leer -- `showModal` und
 * `featureLifecycleRegistry` mounten dort selbst per `mount()`.
 *
 * Die `#tabContent`-Panes setzen `hidden` selbst aus `activeTabStore` (`useActiveTab()`);
 * `tabController.zeigeTab()` schreibt fuer diese Hauptgruppe nichts ins DOM. `null`
 * (Store-Anfangswert) heisst: "start" ist aktiv.
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
   * Nur die aktive Tab-Pane ist sichtbar.
   *
   * @param id - Panel-Id (`#start`, `#Berechnung`, ...).
   * @returns `true` fuer alle anderen Panes.
   */
  const verborgen = (id: string): boolean => aktiverTab !== id;

  return (
    <DBShell>
      <AppHeader />

      <DBShellContent>
        <div id="modal"></div>

        <div className="app-hinweise">
          <DBNotification
            id="actAsNotice"
            semantic="warning"
            variant="standalone"
            icon="eye"
            role="status"
            ariaLive="polite"
            headline="Fremde Benutzerdaten aktiv"
            hidden
          >
            {/* Knopf im Inhalt, nicht im `link`-Slot: DB richtet einen `.db-button` dort als Schliessen-Knopf oben rechts aus. */}
            <DBStack gap="x-small" alignment="start">
              <span id="actAsNoticeText">Du siehst gerade die Daten eines anderen Benutzers.</span>
              <DBButton variant="filled" data-color="warning" size="small" id="actAsOwnDataButton" type="button">
                Eigene Daten laden
              </DBButton>
            </DBStack>
          </DBNotification>
        </div>

        <div id="conflictReviewBannerMount"></div>

        {/* Abstand zur Kopfzeile nur ausserhalb Start (`#tabContent` in `styles.scss`). */}
        <div id="tabContent">
          <div hidden={verborgen('start')} id="start" role="tabpanel">
            <StartTab />
          </div>

          {featureRegistry.metas().map(({ legacy }) => (
            <div hidden={verborgen(legacy.paneId)} id={legacy.paneId} role="tabpanel" key={legacy.paneId}>
              <div id={legacy.rootId}></div>
            </div>
          ))}

          <div hidden={verborgen('Berechnung')} id="Berechnung" role="tabpanel">
            <BerechnungTab />
          </div>

          <div hidden={verborgen('Admin')} id="Admin" role="tabpanel">
            <div className="admin-rahmen">
              <div id="admin-root"></div>
            </div>
          </div>

          <div hidden={verborgen('Einstellungen')} id="Einstellungen" role="tabpanel">
            <EinstellungenTab />
          </div>
        </div>
      </DBShellContent>

      <AppFooter startYear={2021} />
      <SnackbarHost />
    </DBShell>
  );
}
