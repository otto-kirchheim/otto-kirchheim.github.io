import { useEffect, useState } from 'react';
import { Role, ROLE_HIERARCHY } from '@otto-kirchheim/nebengeld-shared';
import { DBNavigation } from '@db-ux/react-core-components';
import useActiveAdminTab from '@/infrastructure/ui/useActiveAdminTab';

import { AdminUserList } from './components/AdminUserList';
import { AdminVorgabenEditor } from './components/AdminVorgabenEditor';
import { AdminProfileTemplatesManager } from './components/AdminProfileTemplatesManager';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminResourceBrowser } from './components/AdminResourceBrowser';
import { AdminUserProfileEditor } from './components/AdminUserProfileEditor';
import { AdminLogBrowser } from './components/AdminLogBrowser';
import { FormularUpload } from './components/FormularUpload';
import { ACT_AS_STATUS_EVENT, getActAsState } from '@/infrastructure/ui/actAsStatus';
import { fetchCurrentAdminCapabilities } from './utils/api';

type AdminCapabilities = {
  role: Role;
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
  canCreateFormularVorlagen: boolean;
  canEditFormularVorlagen: boolean;
};

export default function AdminTab() {
  const [capabilities, setCapabilities] = useState<AdminCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [actAsState, setActAsState] = useState(getActAsState());

  useEffect(() => {
    (async () => {
      try {
        const nextCapabilities = await fetchCurrentAdminCapabilities();
        setCapabilities(nextCapabilities);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/session ungültig|abgemeldet|token|erneuerung/i.test(message)) {
          console.error('Admin-Berechtigungen konnten nicht geladen werden:', error);
        }
        setCapabilities(null);
      } finally {
        setCapabilitiesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const syncActAsState = () => setActAsState(getActAsState());

    syncActAsState();
    window.addEventListener(ACT_AS_STATUS_EVENT, syncActAsState);
    window.addEventListener('storage', syncActAsState);

    return () => {
      window.removeEventListener(ACT_AS_STATUS_EVENT, syncActAsState);
      window.removeEventListener('storage', syncActAsState);
    };
  }, []);

  const [profileSearch, setProfileSearch] = useState('');
  const [profileSearchKey, setProfileSearchKey] = useState(0);

  const isTeamAdminOrHigher = capabilities
    ? ROLE_HIERARCHY[capabilities.role] >= ROLE_HIERARCHY[Role.TEAM_ADMIN]
    : false;
  const canSeeVorgabenTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditVorgabenGeld);
  const canSeeTemplatesTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditProfileTemplates);
  const canSeeFormulareTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditFormularVorlagen);
  const isSuperAdmin = capabilities?.role === Role.SUPER_ADMIN;

  /**
   * Die Unternavigation des Admin-Panels. Sichtbarkeit haengt an den Berechtigungen; die
   * Trenner sind rein optisch. `tabController.ts`s `zeigeTab()` schaltet ueber `data-tab-target`
   * und schreibt den aktiven Tab in `activeAdminTabStore` -- `data-active`/`aria-selected` unten
   * werden reaktiv aus `aktiverUnterTab` (`useActiveAdminTab()`) berechnet, kein DOM-Handschrieb
   * mehr (Teil 3 der "mehr echtes React"-Initiative, analog `AppHeader.tsx`s Hauptnavigation).
   */
  const unterTabs = (
    [
      { art: 'tab', id: 'dashboard', text: 'Dashboard', sichtbar: isSuperAdmin },
      { art: 'trenner', id: 'trenner-1', text: '', sichtbar: isSuperAdmin },
      { art: 'tab', id: 'users', text: 'Benutzerverwaltung', sichtbar: true },
      { art: 'tab', id: 'vorgaben', text: 'VorgabenGeld', sichtbar: canSeeVorgabenTab },
      { art: 'tab', id: 'templates', text: 'Profile-Templates', sichtbar: canSeeTemplatesTab },
      { art: 'tab', id: 'formulare', text: 'Formular-Vorlagen', sichtbar: canSeeFormulareTab },
      { art: 'trenner', id: 'trenner-2', text: '', sichtbar: isSuperAdmin },
      { art: 'tab', id: 'resources', text: 'Ressourcen', sichtbar: isSuperAdmin },
      { art: 'tab', id: 'profiles', text: 'Profile', sichtbar: isSuperAdmin },
      { art: 'tab', id: 'logs', text: 'Admin-Logs', sichtbar: isSuperAdmin },
    ] as const
  ).filter(eintrag => eintrag.sichtbar);

  // `null` (Store-Anfangswert, vor jedem expliziten Wechsel) heisst "Default noch nicht
  // ueberschrieben" -- identisches Fallback-Muster wie `tabController.ts`s `aktiverTab()`.
  // Der Store haelt die volle Pane-Id (`zeigeTab()` kennt nur `admin-pane-*`, kein Praefix-
  // Wissen) -- hier auf die kurze `unterTabs`/`paneKlasse`-Id zurueckgestutzt.
  const aktiverUnterTab = useActiveAdminTab()?.replace(/^admin-pane-/, '') ?? (isSuperAdmin ? 'dashboard' : 'users');

  /**
   * Einheitliche Pane-Klasse aus dem reaktiven Store abgeleitet (statt der vormals nur fuer
   * `dashboard`/`users` verdrahteten, sonst rein statischen Strings) -- vorher ueberschrieb ein
   * Re-Render aus anderem Grund (`capabilitiesLoading`/`actAsState`) den von `zeigeTab()` per
   * DOM geschriebenen Zustand der uebrigen 6 Panes wieder mit dem Default.
   */
  function paneKlasse(id: string, randKlasse: string): string {
    return `tab-pane fade${aktiverUnterTab === id ? ' show active' : ''} bg-darkmode-override shadow-sm p-3 mb-4 border border-1 ${randKlasse}`;
  }

  function navigateToProfile(userId: string) {
    setProfileSearch(userId);
    setProfileSearchKey(k => k + 1);
    document.getElementById('admin-tab-profiles')?.click();
  }

  return (
    <div className="py-4 px-2 px-md-4">
      <div className="position-relative mb-3 text-center">
        <h1 className="mb-0 d-inline-flex align-items-center gap-1 text-dark-emphasis">
          <span className="db-icon db-font-size-lg" data-icon="profile_card" />
          Admin
        </h1>
      </div>

      <div className="mb-3">
        <DBNavigation className="admin-unternavigation" id="admin-tabs" role="tablist" aria-label="Adminbereiche">
          {unterTabs.map(eintrag =>
            eintrag.art === 'trenner' ? (
              <li key={eintrag.id} className="db-navigation-item admin-unternavigation-trenner" aria-hidden="true" />
            ) : (
              <li
                key={eintrag.id}
                className="db-navigation-item"
                data-active={String(eintrag.id === aktiverUnterTab)}
                role="presentation"
              >
                <button
                  id={`admin-tab-${eintrag.id}`}
                  data-tab-target={`admin-pane-${eintrag.id}`}
                  type="button"
                  role="tab"
                  aria-controls={`admin-pane-${eintrag.id}`}
                  aria-selected={eintrag.id === aktiverUnterTab}
                  tabIndex={eintrag.id === aktiverUnterTab ? 0 : -1}
                >
                  {eintrag.text}
                </button>
              </li>
            ),
          )}
        </DBNavigation>
      </div>

      {capabilitiesLoading && <div className="small text-body-secondary mb-3">Berechtigungen werden geladen...</div>}

      {!capabilitiesLoading && !canSeeVorgabenTab && !canSeeTemplatesTab && !canSeeFormulareTab && (
        <p className="text-body-secondary mb-3">
          Es sind aktuell keine zusätzlichen Admin-Rechte für VorgabenGeld, Profile-Templates oder Formular-Vorlagen
          vergeben.
        </p>
      )}

      <div className="tab-content" id="admin-tab-content">
        {isSuperAdmin && (
          <div
            className={paneKlasse('dashboard', 'border-primary-subtle')}
            id="admin-pane-dashboard"
            role="tabpanel"
            aria-labelledby="admin-tab-dashboard"
            tabIndex={0}
          >
            <AdminDashboard />
          </div>
        )}

        <div
          className={paneKlasse('users', 'border-primary-subtle')}
          id="admin-pane-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          tabIndex={0}
        >
          {!actAsState.active && (
            <p className="small text-body-secondary mb-3">
              Eigene Daten aktiv: Du arbeitest gerade mit deinen eigenen Daten.
            </p>
          )}
          <AdminUserList isSuperAdmin={isSuperAdmin} />
        </div>

        {canSeeVorgabenTab && (
          <div
            className={paneKlasse('vorgaben', 'border-info-subtle')}
            id="admin-pane-vorgaben"
            role="tabpanel"
            aria-labelledby="admin-tab-vorgaben"
            tabIndex={0}
          >
            <AdminVorgabenEditor />
          </div>
        )}

        {canSeeTemplatesTab && (
          <div
            className={paneKlasse('templates', 'border-warning-subtle')}
            id="admin-pane-templates"
            role="tabpanel"
            aria-labelledby="admin-tab-templates"
            tabIndex={0}
          >
            <AdminProfileTemplatesManager />
          </div>
        )}

        {canSeeFormulareTab && (
          <div
            className={paneKlasse('formulare', 'border-info-subtle')}
            id="admin-pane-formulare"
            role="tabpanel"
            aria-labelledby="admin-tab-formulare"
            tabIndex={0}
          >
            <FormularUpload />
          </div>
        )}

        {isSuperAdmin && (
          <div
            className={paneKlasse('resources', 'border-danger-subtle')}
            id="admin-pane-resources"
            role="tabpanel"
            aria-labelledby="admin-tab-resources"
            tabIndex={0}
          >
            <AdminResourceBrowser onNavigateToUser={navigateToProfile} />
          </div>
        )}

        {isSuperAdmin && (
          <div
            className={paneKlasse('profiles', 'border-success-subtle')}
            id="admin-pane-profiles"
            role="tabpanel"
            aria-labelledby="admin-tab-profiles"
            tabIndex={0}
          >
            <AdminUserProfileEditor initialSearch={profileSearch} searchKey={profileSearchKey} />
          </div>
        )}

        {isSuperAdmin && (
          <div
            className={paneKlasse('logs', 'border-secondary-subtle')}
            id="admin-pane-logs"
            role="tabpanel"
            aria-labelledby="admin-tab-logs"
            tabIndex={0}
          >
            <AdminLogBrowser />
          </div>
        )}
      </div>
    </div>
  );
}
