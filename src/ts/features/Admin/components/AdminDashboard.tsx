import { useEffect, useState } from 'preact/hooks';
import { fetchAdminStats, type AdminStats } from '../utils/api';

const ROLE_LABELS: Record<string, string> = {
  member: 'Mitglied',
  'team-admin': 'Team-Admin',
  'org-admin': 'Org-Admin',
  'super-admin': 'Super-Admin',
};

function StatCard({
  title,
  value,
  sub,
  icon,
  colorClass,
}: {
  title: string;
  value: number;
  sub?: string;
  icon: string;
  colorClass: string;
}) {
  return (
    <div class="col-sm-6 col-xl-3">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-body d-flex gap-3 align-items-start">
          <span class={`material-icons-round fs-2 ${colorClass}`}>{icon}</span>
          <div style="min-width:0">
            <div class="text-body-secondary small">{title}</div>
            <div class="fs-3 fw-bold lh-1 mt-1">{value.toLocaleString()}</div>
            {sub && <div class="text-body-secondary small mt-1">{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchAdminStats()
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Wird geladen…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="alert alert-danger d-flex align-items-center gap-2">
        <span class="material-icons-round">error</span>
        <span>{error}</span>
        <button class="btn btn-sm btn-outline-danger ms-auto" onClick={load}>
          Neu laden
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div class="row g-3 mb-4">
        {(() => {
          const gap = stats.users.total - stats.profiles.total;
          const sub = gap === 0
            ? `Aktiv (30T): ${stats.users.active30d} · Profile vollständig ✓`
            : `Aktiv (30T): ${stats.users.active30d} · ${gap} Profile fehlen!`;
          return (
            <StatCard
              title="Benutzer"
              value={stats.users.total}
              sub={sub}
              icon={gap === 0 ? 'group' : 'warning'}
              colorClass={gap === 0 ? 'text-primary' : 'text-danger'}
            />
          );
        })()}
        <StatCard
          title="Profile-Templates"
          value={stats.templates.total}
          sub={`Aktiv: ${stats.templates.active} · Inaktiv: ${stats.templates.inactive}`}
          icon="content_copy"
          colorClass="text-info"
        />
        <StatCard
          title="Admin-Aktivität"
          value={stats.adminActivity.logsLast7d}
          sub="Logs (letzte 7 Tage)"
          icon="history"
          colorClass="text-warning"
        />
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title fw-semibold mb-3">Rollenverteilung</h6>
              {Object.entries(stats.users.byRole).map(([role, count]) => (
                <div
                  key={role}
                  class="d-flex justify-content-between align-items-center py-2 border-bottom"
                >
                  <span class="small">{ROLE_LABELS[role] ?? role}</span>
                  <span class="badge bg-secondary rounded-pill">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title fw-semibold mb-3">Ressourcenbestand</h6>
              {(
                [
                  ['Bereitschaftseinsätze', stats.resources.bereitschaftseinsaetze],
                  ['Bereitschaftszeiträume', stats.resources.bereitschaftszeitraeume],
                  ['Einsatzwechseltätigkeiten', stats.resources.einsatzwechseltaetigkeiten],
                  ['Nebengeld-Einträge', stats.resources.nebengeld],
                ] as [string, number][]
              ).map(([label, count]) => (
                <div
                  key={label}
                  class="d-flex justify-content-between align-items-center py-2 border-bottom"
                >
                  <span class="small">{label}</span>
                  <span class="badge bg-primary rounded-pill">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div class="text-end mt-3">
        <button class="btn btn-sm btn-outline-secondary" onClick={load}>
          <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
            refresh
          </span>
          Aktualisieren
        </button>
      </div>
    </div>
  );
}
