import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { AdminUserList } from './components/AdminUserList';
import { AdminVorgabenEditor } from './components/AdminVorgabenEditor';
import { AdminProfileTemplatesManager } from './components/AdminProfileTemplatesManager';
import { ACT_AS_STATUS_EVENT, getActAsState, getServerUrl } from '../utilities';
import { fetchCurrentAdminCapabilities } from './utils/api';

type AdminCapabilities = {
  role: 'member' | 'team-admin' | 'org-admin' | 'super-admin';
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
};

export default function AdminTab() {
  const [adminJsUrl, setAdminJsUrl] = useState<string>('/admin');
  const [capabilities, setCapabilities] = useState<AdminCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [actAsState, setActAsState] = useState(getActAsState());

  useEffect(() => {
    (async () => {
      try {
        const apiBase = await getServerUrl();
        const backendBase = apiBase.replace(/\/api\/v2\/?$/, '');
        setAdminJsUrl(`${backendBase}/lstadmin`);

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

  const isTeamAdminOrHigher =
    capabilities?.role === 'team-admin' || capabilities?.role === 'org-admin' || capabilities?.role === 'super-admin';
  const canSeeVorgabenTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditVorgabenGeld);
  const canSeeTemplatesTab = Boolean(isTeamAdminOrHigher && capabilities?.canEditProfileTemplates);
  const isSuperAdmin = capabilities?.role === 'super-admin';

  return (
    <div class="admin-tab-bg py-4 px-2 px-md-4">
      <div class="position-relative mb-3 text-center">
        <h1 class="mb-0 d-inline-flex align-items-center gap-1 text-dark-emphasis">
          <span class="material-icons-round" style="font-size: 1.5rem">
            manage_accounts
          </span>
          Admin
        </h1>
      </div>

      <div class="mb-3">
        <ul class="nav nav-pills flex-wrap gap-2 bg-dark-subtle rounded-3 p-2" id="admin-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button
              class="nav-link active"
              id="admin-tab-users"
              data-bs-toggle="pill"
              data-bs-target="#admin-pane-users"
              type="button"
              role="tab"
              aria-controls="admin-pane-users"
              aria-selected="true"
            >
              Benutzerverwaltung
            </button>
          </li>
          {canSeeVorgabenTab && (
            <li class="nav-item" role="presentation">
              <button
                class="nav-link"
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
            <li class="nav-item" role="presentation">
              <button
                class="nav-link"
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
          {isSuperAdmin && (
            <li class="nav-item ms-md-auto" role="presentation">
              <a href={adminJsUrl} target="_blank" rel="noreferrer" class="nav-link d-flex align-items-center">
                <span class="material-icons-round me-1" style="font-size: 1rem; vertical-align: middle">
                  open_in_new
                </span>
                AdminJS
              </a>
            </li>
          )}
        </ul>
      </div>

      {capabilitiesLoading && <div class="small text-body-secondary mb-3">Berechtigungen werden geladen...</div>}

      {!capabilitiesLoading && !canSeeVorgabenTab && !canSeeTemplatesTab && (
        <div class="alert alert-secondary mb-3" role="alert">
          Es sind aktuell keine zusätzlichen Admin-Rechte für VorgabenGeld oder Profile-Templates vergeben.
        </div>
      )}

      <div class="tab-content" id="admin-tab-content">
        <div
          class="tab-pane fade show active bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-primary-subtle"
          id="admin-pane-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          tabIndex={0}
        >
          {!actAsState.active && (
            <div class="alert alert-secondary border shadow-sm mb-3" role="status" aria-live="polite">
              <div class="d-flex align-items-start gap-2">
                <span class="material-icons-round mt-1">home</span>
                <div>
                  <div class="fw-semibold">Eigene Daten aktiv</div>
                  <div class="small">Du arbeitest gerade mit deinen eigenen Daten.</div>
                </div>
              </div>
            </div>
          )}
          <AdminUserList />
        </div>

        {canSeeVorgabenTab && (
          <div
            class="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-info-subtle"
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
            class="tab-pane fade bg-darkmode-override rounded-3 shadow-sm p-3 mb-4 border border-1 border-warning-subtle"
            id="admin-pane-templates"
            role="tabpanel"
            aria-labelledby="admin-tab-templates"
            tabIndex={0}
          >
            <AdminProfileTemplatesManager />
          </div>
        )}
      </div>
    </div>
  );
}

export function mountAdminTab(remountKey = 'default'): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  render(<AdminTab key={remountKey} />, adminRoot);
}

export function unmountAdminTab(): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  render(null, adminRoot);
}
