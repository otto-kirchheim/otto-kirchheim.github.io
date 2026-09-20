import { Fragment } from 'react';
import {
  DBButton,
  DBControlPanelActions1,
  DBControlPanelActions2,
  DBControlPanelBrand,
  DBControlPanelDesktop,
  DBControlPanelMobile,
  DBControlPanelNavigation,
  DBControlPanelNavigationItem,
  DBDivider,
  DBSelect,
  DBTooltip,
} from '@db-ux/react-core-components';
import { DBLoadingButton } from '@/components';
import schliesseMobilenDrawer from './schliesseMobilenDrawer';
import ThemeSwitcher from './ThemeSwitcher';
import useActiveTab from './useActiveTab';
import useMediaQuery from './useMediaQuery';
import useNavigationVisible from './useNavigationVisible';
import { BREAKPOINTS } from './breakpoints';

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
 * Kopfzeile der App-Shell auf Basis von DB UX' `DBControlPanelDesktop`/`DBControlPanelMobile` mit
 * `DBControlPanelNavigation(Item)`.
 *
 * `DBShell` haelt Desktop- UND Mobile-Control-Panel gleichzeitig im DOM; eine reine CSS-Weiche
 * bei 48em (768px, `shell.css`) blendet je eines aus. Jedes `data-tab-target`/`role="tab"`/jede
 * Id existiert deshalb ZWEIMAL im DOM (siehe `auth/index.ts`s `querySelectorAll('#admin-tab')`,
 * `navigationVisibleStore.ts`).
 *
 * `DBControlPanelMobile` verwaltet den Offen-Zustand seines Drawers selbst, hier ist dafuer
 * kein State noetig.
 *
 * Die Marke ist ein eigenes `<a>` um `DBControlPanelBrand`: die DB-Komponente rendert nur ein
 * `<div>`, der Link (`href="#start"`, `data-tab-target`) muss von uns kommen.
 *
 * Gibt NUR die beiden Control-Panels zurueck (kein eigenes `DBShell`): dessen CSS-Grid braucht
 * Control-Panels UND `DBShellContent` als direkte Geschwister unter demselben `.db-shell`, siehe
 * `App.tsx`.
 */
export default function AppHeader() {
  const navigationSichtbar = useNavigationVisible();
  const aktiverTab = useActiveTab();
  // Bis ${BREAKPOINTS.md}px kurze Monatsnamen: die volle Namensliste macht das Select auf
  // schmalen Viewports zu breit (siehe `actions1`).
  const schmalerViewport = useMediaQuery(`(max-width: ${BREAKPOINTS.md}px)`);
  const monatsNamen = schmalerViewport ? MONATE_KURZ : MONATE_LANG;
  // Shells eigene Mobil-Weiche (siehe Kopfkommentar): bis 768px liegt die Navigation untereinander
  // in der Schublade statt in der Kopfzeile -- der Trenner vor "Berechnung" muss dort liegend sein.
  const istMobil = useMediaQuery(`(max-width: ${BREAKPOINTS.sm}px)`);

  const brand = (
    <a href="#start" id="brand-start-tab" data-tab-target="start">
      <DBControlPanelBrand>Nebengeld</DBControlPanelBrand>
    </a>
  );

  const actions1 = (
    <DBControlPanelActions1>
      <DBLoadingButton variant="brand" type="button" id="btnLogin">
        Anmelden
      </DBLoadingButton>

      {/* `#MonatFeld`: `auth/index.ts` blendet den Wrapper erst nach erfolgreichem Login per
          `classList.remove('d-none')` ein; `<DBSelect>` bringt selbst keinen Wrapper mit. */}
      <div id="MonatFeld" className="d-none">
        <DBSelect
          className="db-select"
          id="Monat"
          label="Monat"
          showLabel={false}
          options={monatsNamen.map((name, index) => ({ value: index + 1, label: name }))}
        />
      </div>
    </DBControlPanelActions1>
  );

  const actions2 = (
    <DBControlPanelActions2>
      {/* Einstellungen liegt im eigenen Slot `actions2`, nicht in der Navigation -- der Knopf
          braucht dieselbe `navigationSichtbar`-Bedingung explizit, sonst bliebe er auch
          abgemeldet sichtbar. */}
      <a
        className={navigationSichtbar ? 'db-button' : 'db-button d-none'}
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
        onClick={event => schliesseMobilenDrawer(event.currentTarget)}
      >
        <DBTooltip>Einstellungen</DBTooltip>
      </a>
      {/* `#admin` (nicht `#admin-tab`): `auth/index.ts` blendet darueber den KOMPLETTEN Knopf
          per `d-none` aus, solange der Benutzer kein Admin ist; `#admin-tab` dient dort als
          Ziel fuer Klick-Listener/Tab-Attribute. */}
      <span id="admin" className="d-none">
        <a
          className="db-button"
          data-variant="ghost"
          data-icon="key"
          data-no-text="true"
          role="tab"
          id="admin-tab"
          href="#Admin"
          data-tab-target="Admin"
          aria-controls="Admin"
          aria-selected={aktiverTab === 'Admin'}
          aria-label="Admin"
          tabIndex={aktiverTab === 'Admin' ? 0 : -1}
          onClick={event => schliesseMobilenDrawer(event.currentTarget)}
        >
          <DBTooltip>Admin</DBTooltip>
        </a>
      </span>
      {/* Ausloggen ist hier immer erreichbar statt im Einstellungen-Tab; sichtbar nur nach Login
          (wie `#einstellungen-tab`). Den Klick-Handler haengt `Einstellungen/index.ts` per Id an,
          unabhaengig vom Renderort. */}
      <DBButton
        className={navigationSichtbar ? undefined : 'd-none'}
        variant="ghost"
        type="button"
        id="btnLogout"
        icon="log_out"
        noText
        aria-label="Ausloggen"
        onClick={event => schliesseMobilenDrawer(event.currentTarget)}
      >
        <DBTooltip>Ausloggen</DBTooltip>
      </DBButton>

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
      <DBDivider variant={istMobil ? 'horizontal' : 'vertical'} />
      {/* `aktiverTab === null` (Panel `start`, kein eigener Tab) legt den Tastaturfokus der Tabliste
          hierher -- der Roving-Tabindex braucht sonst keinen Eintrag mit `0`. */}
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
