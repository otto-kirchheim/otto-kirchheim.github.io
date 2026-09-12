import { useState } from 'react';
import { DBHeader, DBNavigation, DBNavigationItem } from '@db-ux/react-core-components';
import ThemeSwitcher from './ThemeSwitcher';
import useNavigationVisible from './useNavigationVisible';

/**
 * Phase K5: `<header class="db-header">` (index.html) als echter `DBHeader`. Groesster K-Slice --
 * loest `navDrawer.ts`/`NavDrawerShell.tsx` (K4) VOLLSTAENDIG ab: `DBHeader` rendert seine
 * `children` (die Navigation) selbst zweimal -- einmal inline in der Kopfzeile, einmal als Kopie
 * in seinem eingebauten Drawer (Puppeteer/Test-verifiziert: `DBHeader` dupliziert den
 * React-Baum, es gibt keinen Umzugs-Kniff mehr). `drawerOpen`/`onToggle` ersetzen
 * `showModal()`/`close()`.
 *
 * WICHTIG -- Kompatibilitaetsbruecke fuer `tabController.ts` & Co.: jedes `data-tab-target`/
 * `role="tab"`/`id` existiert jetzt IM DOM ZWEIMAL (Desktop-Kopie + Drawer-Kopie), gleichzeitig.
 * Das bricht jeden Aufrufer, der per `querySelector('#literal-id')` GENAU EIN Element erwartet:
 * - `tabController.ts` war bereits sicher (arbeitet ueber `data-tab-target`-Attribut-Selektoren
 *   + Sichtbarkeitsfilter, nicht ueber eindeutige Ids) -- KEINE Aenderung noetig.
 * - `auth/index.ts`s `#admin-tab`-Click-Listener und `#admin`-`d-none`-Toggle wurden auf
 *   `querySelectorAll` umgestellt (siehe dort).
 * - `#navmenu`/`#btn-navmenu` (Sichtbarkeits-Toggle bei Login/Logout, 3 Stellen) gibt es unter
 *   `DBHeader` nicht mehr -- ersetzt durch `navigationVisibleStore`/`useNavigationVisible`.
 *   Der Burger-Knopf selbst bleibt IMMER sichtbar (User-Entscheidung): `DBHeader` erzeugt ihn
 *   intern ohne Sichtbarkeits-Prop, vor Login oeffnet er eine fast leere Schublade.
 *
 * Marke bleibt bewusst HANDGESCHRIEBEN (kein `DBBrand`): `DBBrand` rendert selbst ein `<div>`,
 * kein `<a>` -- unser Link-Verhalten (`href="#start"`, `data-tab-target`, `.db-brand`-Styling
 * in `styles.scss:947` als Link-Reset) muesste sonst dupliziert/umgebaut werden. Bestandsschutz
 * fuer bereits funktionierendes Markup, kein neues UI-Element.
 */
export default function AppHeader() {
  const [drawerOffen, setDrawerOffen] = useState(false);
  const navigationSichtbar = useNavigationVisible();

  return (
    <DBHeader
      id="appHeader"
      className="sticky-top"
      drawerOpen={drawerOffen}
      onToggle={setDrawerOffen}
      burgerMenuLabel="Menü"
      drawerHeaderText="Nebengeld"
      brand={
        <a className="db-brand" href="#start" id="brand-start-tab" data-tab-target="start" data-icon="none">
          <img src="icons/192x192-icon.png" alt="" width={30} height={30} />
          Nebengeld
        </a>
      }
      primaryAction={
        <>
          <button className="db-button" data-variant="brand" type="button" id="btnLogin">
            Anmelden
          </button>
          <div className="db-select d-none" id="MonatFeld" data-hide-label="true">
            <label htmlFor="Monat">Monatswechsel</label>
            {/* `data-custom-validity="neutral"` unterdrueckt DB-UXs automatische
                `:user-valid`-Erfolgsfaerbung (gruener Rahmen) -- der Monatswechsel ist keine
                Formularvalidierung, `required` steht nur der Semantik wegen da. */}
            <select id="Monat" required data-custom-validity="neutral">
              <option value="1">Januar</option>
              <option value="2">Februar</option>
              <option value="3">März</option>
              <option value="4">April</option>
              <option value="5">Mai</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Dezember</option>
            </select>
          </div>
        </>
      }
    >
      <DBNavigation className={navigationSichtbar ? undefined : 'd-none'} role="tablist" aria-label="Hauptnavigation">
        <DBNavigationItem role="presentation" className="d-none" backButtonText="Zurück">
          <a
            role="tab"
            id="bereitschaft-tab"
            href="#Bereitschaft"
            data-tab-target="Bereitschaft"
            aria-controls="Bereitschaft"
            aria-selected="false"
            tabIndex={-1}
          >
            Bereitschaft
          </a>
        </DBNavigationItem>
        <DBNavigationItem role="presentation" className="d-none" backButtonText="Zurück">
          <a
            role="tab"
            id="ewt-tab"
            href="#EWT"
            data-tab-target="EWT"
            aria-controls="EWT"
            aria-selected="false"
            tabIndex={-1}
          >
            EWT
          </a>
        </DBNavigationItem>
        <DBNavigationItem role="presentation" className="d-none" backButtonText="Zurück">
          <a
            role="tab"
            id="neben-tab"
            href="#Neben"
            data-tab-target="Neben"
            aria-controls="Neben"
            aria-selected="false"
            tabIndex={-1}
          >
            Nebenbezüge
          </a>
        </DBNavigationItem>
        <DBNavigationItem role="presentation" className="d-none" backButtonText="Zurück">
          <a
            role="tab"
            id="ea-tab"
            href="#EA"
            data-tab-target="EA"
            aria-controls="EA"
            aria-selected="false"
            tabIndex={-1}
          >
            Entgeltausgleich
          </a>
        </DBNavigationItem>
        {/* Erster immer sichtbarer Eintrag: haelt beim Laden (Panel `start`, kein eigener
              Tab) den Tastaturfokus fuer die Tabliste. `tabController` zieht den `tabindex` bei
              jedem echten Tabwechsel nach. `nav-trenner`: optische Grenze zwischen den
              Fachbereichen (Bereitschaft/EWT/Neben/EA) und den uebergreifenden Bereichen
              (Berechnung, Einstellungen) -- siehe styles.scss. */}
        <DBNavigationItem role="presentation" className="nav-trenner" backButtonText="Zurück">
          <a
            role="tab"
            id="berechnung-tab"
            href="#Berechnung"
            data-tab-target="Berechnung"
            aria-controls="Berechnung"
            aria-selected="false"
            tabIndex={0}
          >
            Berechnung
          </a>
        </DBNavigationItem>
        <DBNavigationItem role="presentation" className="nav-rechts" backButtonText="Zurück">
          <a
            role="tab"
            id="einstellungen-tab"
            href="#Einstellungen"
            data-tab-target="Einstellungen"
            aria-controls="Einstellungen"
            aria-selected="false"
            tabIndex={-1}
          >
            <span className="db-icon d-none d-md-inline" data-icon="gear_wheel" />
            <span className="d-md-none">Einstellungen</span>
          </a>
        </DBNavigationItem>
        <DBNavigationItem role="presentation" className="d-none" id="admin" backButtonText="Zurück">
          <a
            role="tab"
            id="admin-tab"
            href="#Admin"
            data-tab-target="Admin"
            aria-controls="Admin"
            aria-selected="false"
            tabIndex={-1}
          >
            <span className="db-icon d-none d-md-inline" data-icon="shield_check" />
            <span className="d-md-none">Admin</span>
          </a>
        </DBNavigationItem>
        <li className="db-navigation-item" role="presentation">
          <ThemeSwitcher />
        </li>
      </DBNavigation>
    </DBHeader>
  );
}
