import { Fragment } from 'react';
import {
  DBControlPanelActions1,
  DBControlPanelActions2,
  DBControlPanelBrand,
  DBControlPanelDesktop,
  DBControlPanelMobile,
  DBControlPanelNavigation,
  DBControlPanelNavigationItem,
  DBSelect,
} from '@db-ux/react-core-components';
import ThemeSwitcher from './ThemeSwitcher';
import useActiveTab from './useActiveTab';
import useMediaQuery from './useMediaQuery';
import useNavigationVisible from './useNavigationVisible';

const MONATE_LANG = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

/**
 * Phase "Shell"-Umbau: `DBHeader`/`DBNavigation` (fixe CSS-Weiche bei 1024px, siehe
 * `useHeaderForceMobile.ts`s Historie) abgeloest durch DB UX' `DBShell` +
 * `DBControlPanelDesktop`/`DBControlPanelMobile` + `DBControlPanelNavigation(Item)`.
 *
 * `DBShell` haelt Desktop- UND Mobile-Control-Panel gleichzeitig im DOM (nicht wie `DBHeader`
 * EIN adaptives Element) -- reine CSS-Weiche bei genau 48em (768px, `shell.css`:
 * `.db-shell > .db-control-panel-mobile { display:none }` ab `48em<width`, umgekehrt fuer
 * `.db-control-panel-desktop` bei `width<=48em`). Jedes `data-tab-target`/`role="tab"`/Id
 * existiert deshalb weiterhin ZWEIMAL im DOM (Desktop-Kopie + Mobile-Kopie), exakt wie zuvor bei
 * `DBHeader` -- dieselben Kompatibilitaetsregeln gelten unveraendert (siehe `auth/index.ts`s
 * `querySelectorAll('#admin-tab')`, `navigationVisibleStore.ts`).
 *
 * `controlPanelDesktopPosition="top"`/`controlPanelMobilePosition="top"` (= Defaultwert von
 * `DBShell`, hier explizit fuer Lesbarkeit): echter horizontaler Header-Modus (CSS-Grid
 * `brand | navigation | actions-1 | actions-2`), keine Sidebar -- verifiziert in
 * `node_modules/@db-ux/core-components/build/components/shell/shell.css:78-102`.
 *
 * `DBControlPanelMobile` verwaltet seinen Drawer-Offen-Zustand SELBST (intern, `useState`) --
 * anders als `DBHeader` (dort `drawerOpen`/`onToggle` als kontrollierte Props noetig). Kein
 * eigener `drawerOffen`-State mehr in dieser Komponente noetig.
 *
 * Marke bleibt bewusst HANDGESCHRIEBEN (kein `DBControlPanelBrand`): das rendert selbst ein
 * `<div>`, kein `<a>` -- unser Link-Verhalten (`href="#start"`, `data-tab-target`,
 * `.db-brand`-Styling) muesste sonst dupliziert/umgebaut werden.
 *
 * Gibt NUR die beiden Control-Panels zurueck (kein eigenes `DBShell`) -- `DBShell`s
 * CSS-Grid (`"control-panel" "shell-content"`) braucht Control-Panels UND `DBShellContent` als
 * direkte Geschwister unter demselben `.db-shell`-Wurzelelement, siehe `App.tsx`.
 */
export default function AppHeader() {
  const navigationSichtbar = useNavigationVisible();
  const aktiverTab = useActiveTab();
  // Unter 1024px kurze Monatsnamen (spart Platz im Select, siehe `actions1` -- User-Fund:
  // die volle Namensliste war auf schmalen Viewports zu breit).
  const schmalerViewport = useMediaQuery('(max-width: 1023px)');
  const monatsNamen = schmalerViewport ? MONATE_KURZ : MONATE_LANG;

  const brand = (
    <a href="#start" id="brand-start-tab" data-tab-target="start">
      <DBControlPanelBrand data-icon-variant="icons/192x192-icon.png">Nebengeld</DBControlPanelBrand>
    </a>
  );

  const actions1 = (
    <DBControlPanelActions1>
      <button className="db-button" data-variant="brand" type="button" id="btnLogin">
        Anmelden
      </button>

      <DBSelect
        className="db-select"
        id="Monat"
        label="Monat"
        showLabel={false}
        options={monatsNamen.map((name, index) => ({ value: index + 1, label: name }))}
      />
    </DBControlPanelActions1>
  );

  const actions2 = (
    <DBControlPanelActions2>
      <a
        className="db-button"
        data-variant="ghost"
        data-icon="gear_wheel"
        data-no-text="true"
        role="tab"
        id="einstellungen-tab"
        href="#Einstellungen"
        data-tab-target="Einstellungen"
        aria-controls="Einstellungen"
        aria-selected={aktiverTab === 'Einstellungen'}
        aria-label="Einstellungen"
        tabIndex={aktiverTab === 'Einstellungen' ? 0 : -1}
      />
      {/* `#admin` (nicht `#admin-tab`): `auth/index.ts` blendet darueber den KOMPLETTEN Knopf
          per `d-none` aus, solange der Benutzer kein Admin ist -- separate Id von `#admin-tab`
          (Klick-Listener/Tab-Attribute), weil beide `querySelectorAll` mit unterschiedlichem
          Zweck brauchen (siehe dortiger Kommentar). */}
      <span id="admin" className="d-none">
        <a
          className="db-button"
          data-variant="ghost"
          data-icon="shield_check"
          data-no-text="true"
          role="tab"
          id="admin-tab"
          href="#Admin"
          data-tab-target="Admin"
          aria-controls="Admin"
          aria-selected={aktiverTab === 'Admin'}
          aria-label="Admin"
          tabIndex={aktiverTab === 'Admin' ? 0 : -1}
        />
      </span>
      <ThemeSwitcher />
    </DBControlPanelActions2>
  );

  const navigation = (
    <DBControlPanelNavigation className={navigationSichtbar ? undefined : 'd-none'} aria-label="Hauptnavigation">
      <DBControlPanelNavigationItem active={aktiverTab === 'Bereitschaft'}>
        <a
          role="tab"
          id="bereitschaft-tab"
          href="#Bereitschaft"
          data-tab-target="Bereitschaft"
          aria-controls="Bereitschaft"
          aria-selected={aktiverTab === 'Bereitschaft'}
          tabIndex={aktiverTab === 'Bereitschaft' ? 0 : -1}
        >
          Bereitschaft
        </a>
      </DBControlPanelNavigationItem>
      <DBControlPanelNavigationItem active={aktiverTab === 'EWT'}>
        <a
          role="tab"
          id="ewt-tab"
          href="#EWT"
          data-tab-target="EWT"
          aria-controls="EWT"
          aria-selected={aktiverTab === 'EWT'}
          tabIndex={aktiverTab === 'EWT' ? 0 : -1}
        >
          EWT
        </a>
      </DBControlPanelNavigationItem>
      <DBControlPanelNavigationItem active={aktiverTab === 'Neben'}>
        <a
          role="tab"
          id="neben-tab"
          href="#Neben"
          data-tab-target="Neben"
          aria-controls="Neben"
          aria-selected={aktiverTab === 'Neben'}
          tabIndex={aktiverTab === 'Neben' ? 0 : -1}
        >
          Nebenbezüge
        </a>
      </DBControlPanelNavigationItem>
      <DBControlPanelNavigationItem active={aktiverTab === 'EA'}>
        <a
          role="tab"
          id="ea-tab"
          href="#EA"
          data-tab-target="EA"
          aria-controls="EA"
          aria-selected={aktiverTab === 'EA'}
          tabIndex={aktiverTab === 'EA' ? 0 : -1}
        >
          Entgeltausgleich
        </a>
      </DBControlPanelNavigationItem>
      {/* `aktiverTab === null` (Panel `start`, kein eigener Tab) haelt den Tastaturfokus fuer
          die Tabliste hier -- roving Tabindex braucht sonst gar keinen Eintrag mit `0`. */}
      <DBControlPanelNavigationItem active={aktiverTab === 'Berechnung'}>
        <a
          role="tab"
          id="berechnung-tab"
          href="#Berechnung"
          data-tab-target="Berechnung"
          aria-controls="Berechnung"
          aria-selected={aktiverTab === 'Berechnung'}
          tabIndex={aktiverTab === null || aktiverTab === 'Berechnung' ? 0 : -1}
        >
          Berechnung
        </a>
      </DBControlPanelNavigationItem>
    </DBControlPanelNavigation>
  );

  return (
    <Fragment>
      <DBControlPanelDesktop
        id="appHeaderDesktop"
        orientation="horizontal"
        brand={brand}
        actions1={actions1}
        actions2={actions2}
      >
        {navigation}
      </DBControlPanelDesktop>
      <DBControlPanelMobile
        id="appHeaderMobile"
        position="top"
        burgerMenuLabel="Menü"
        drawerHeaderText="Nebengeld"
        brand={brand}
        actions1={actions1}
        actions2={actions2}
      >
        {navigation}
      </DBControlPanelMobile>
    </Fragment>
  );
}
