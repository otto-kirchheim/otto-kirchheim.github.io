import { useEffect, useState } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

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
  role: 'member' | 'team-admin' | 'org-admin' | 'super-admin';
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

  const isTeamAdminOrHigher =
    capabilities?.role === 'team-admin' || capabilities?.role === 'org-admin' || capabilities?.role === 'super-admin';
  const canSeeVorgabenTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditVorgabenGeld);
  const canSeeTemplatesTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditProfileTemplates);
  const canSeeFormulareTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditFormularVorlagen);
  const isSuperAdmin = capabilities?.role === 'super-admin';

  function navigateToProfile(userId: string) {
    setProfileSearch(userId);
    setProfileSearchKey(k => k + 1);
    document.getElementById('admin-tab-profiles')?.click();
  }

  return (
    <div className="admin-tab-bg py-4 px-2 px-md-4">
      <div className="position-relative mb-3 text-center">
        <h1 className="mb-0 d-inline-flex align-items-center gap-1 text-dark-emphasis">
          <span className="db-icon db-font-size-lg" data-icon="profile_card" />
          Admin
        </h1>
      </div>

      <div className="mb-3">
        <ul
          className="nav nav-pills flex-wrap align-items-center gap-2 bg-dark-subtle rounded-3 p-2"
          id="admin-tabs"
          role="tablist"
        >
          {isSuperAdmin && (
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${isSuperAdmin ? 'active' : ''}`}
                id="admin-tab-dashboard"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-dashboard"
                type="button"
                role="tab"
                aria-controls="admin-pane-dashboard"
                aria-selected={isSuperAdmin ? 'true' : 'false'}
              >
                Dashboard
              </button>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item d-flex align-items-center" aria-hidden="true">
              <div className="vr" style={{ height: '1.5rem' }} />
            </li>
          )}
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${!isSuperAdmin ? 'active' : ''}`}
              id="admin-tab-users"
              data-bs-toggle="pill"
              data-bs-target="#admin-pane-users"
              type="button"
              role="tab"
              aria-controls="admin-pane-users"
              aria-selected={!isSuperAdmin ? 'true' : 'false'}
            >
              Benutzerverwaltung
            </button>
          </li>
          {canSeeVorgabenTab && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-vorgaben"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-vorgaben"
                type="button"
                role="tab"
                aria-controls="admin-pane-vorgaben"
                aria-selected="false"
              >
                VorgabenGeld
              </button>
            </li>
          )}
          {canSeeTemplatesTab && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-templates"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-templates"
                type="button"
                role="tab"
                aria-controls="admin-pane-templates"
                aria-selected="false"
              >
                Profile-Templates
              </button>
            </li>
          )}
          {canSeeFormulareTab && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-formulare"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-formulare"
                type="button"
                role="tab"
                aria-controls="admin-pane-formulare"
                aria-selected="false"
              >
                Formular-Vorlagen
              </button>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item d-flex align-items-center" aria-hidden="true">
              <div className="vr" style={{ height: '1.5rem' }} />
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-resources"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-resources"
                type="button"
                role="tab"
                aria-controls="admin-pane-resources"
                aria-selected="false"
              >
                Ressourcen
              </button>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-profiles"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-profiles"
                type="button"
                role="tab"
                aria-controls="admin-pane-profiles"
                aria-selected="false"
              >
                Profile
              </button>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="admin-tab-logs"
                data-bs-toggle="pill"
                data-bs-target="#admin-pane-logs"
                type="button"
                role="tab"
                aria-controls="admin-pane-logs"
                aria-selected="false"
              >
                Admin-Logs
              </button>
            </li>
          )}
        </ul>
      </div>

      {capabilitiesLoading && <div className="small text-body-secondary mb-3">Berechtigungen werden geladen...</div>}

      {!capabilitiesLoading && !canSeeVorgabenTab && !canSeeTemplatesTab && !canSeeFormulareTab && (
        <div className="alert alert-secondary mb-3" role="alert">
          Es sind aktuell keine zusätzlichen Admin-Rechte für VorgabenGeld, Profile-Templates oder Formular-Vorlagen
          vergeben.
        </div>
      )}

      <div className="tab-content" id="admin-tab-content">
        {isSuperAdmin && (
          <div
            className={`tab-pane fade ${isSuperAdmin ? 'show active' : ''} bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-primary-subtle`}
            id="admin-pane-dashboard"
            role="tabpanel"
            aria-labelledby="admin-tab-dashboard"
            tabIndex={0}
          >
            <AdminDashboard />
          </div>
        )}

        <div
          className={`tab-pane fade ${!isSuperAdmin ? 'show active' : ''} bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-primary-subtle`}
          id="admin-pane-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          tabIndex={0}
        >
          {!actAsState.active && (
            <div className="alert alert-secondary border shadow-sm mb-3" role="status" aria-live="polite">
              <div className="d-flex align-items-start gap-2">
                <span className="db-icon mt-1" data-icon="house" />
                <div>
                  <div className="fw-semibold">Eigene Daten aktiv</div>
                  <div className="small">Du arbeitest gerade mit deinen eigenen Daten.</div>
                </div>
              </div>
            </div>
          )}
          <AdminUserList isSuperAdmin={isSuperAdmin} />
        </div>

        {canSeeVorgabenTab && (
          <div
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-info-subtle"
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
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-warning-subtle"
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
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-info-subtle"
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
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-danger-subtle"
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
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-success-subtle"
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
            className="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-secondary-subtle"
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

export function mountAdminTab(remountKey = 'default'): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  mount(adminRoot, <AdminTab key={remountKey} />);
}

export function unmountAdminTab(): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  unmount(adminRoot);
}
