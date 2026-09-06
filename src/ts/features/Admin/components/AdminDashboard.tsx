import { useEffect, useState } from 'react';

import { fetchAdminStats, fetchAdminHeap, type AdminStats, type HeapData } from '../utils/api';
import { MemoryCard, formatUptime } from './adminDashboardCharts';

const ROLE_LABELS: Record<string, string> = {
  member: 'Mitglied',
  'team-admin': 'Team-Admin',
  'org-admin': 'Org-Admin',
  'super-admin': 'Super-Admin',
};

function StatCard({
  title,
  value,
  label,
  unit,
  sub,
  icon,
  colorClass,
}: {
  title: string;
  value?: number;
  label?: string;
  unit?: string;
  sub?: string;
  icon: string;
  colorClass: string;
}) {
  const display = label ?? value?.toLocaleString() ?? '–';
  return (
    <div className="sp-sm-6 sp-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex gap-3 align-items-start">
          <span className={`db-icon fs-2 ${colorClass} db-font-size-lg`} data-icon={icon} />
          <div style={{ minWidth: '0' }}>
            <div className="text-body-secondary small">{title}</div>
            <div className="fs-3 fw-bold lh-1 mt-1">
              {display}
              {unit && <span className="fs-6 fw-normal ms-1 text-body-secondary">{unit}</span>}
            </div>
            {sub && <div className="text-body-secondary small mt-1">{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [heap, setHeap] = useState<HeapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heapLoading, setHeapLoading] = useState(false);
  const [heapDays, setHeapDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  function loadHeap(days = heapDays) {
    setHeapLoading(true);
    return fetchAdminHeap(days)
      .then(setHeap)
      .catch(() => {})
      .finally(() => setHeapLoading(false));
  }

  function changeHeapDays(days: number) {
    setHeapDays(days);
    void loadHeap(days);
  }

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchAdminStats(), fetchAdminHeap(heapDays)])
      .then(([s, h]) => {
        setStats(s);
        setHeap(h);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Wird geladen…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-2">
        <span className="db-icon" data-icon="exclamation_mark_circle" />
        <span>{error}</span>
        <button
          className="db-button ms-auto"
          data-variant="outlined"
          data-color="critical"
          data-size="small"
          onClick={load}
        >
          Neu laden
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const cur = heap?.current;

  return (
    <div>
      <div className="raster mb-4 abstand-3">
        {(() => {
          const gap = stats.users.total - stats.profiles.total;
          const sub =
            gap === 0
              ? `Aktiv (30T): ${stats.users.active30d} · Profile vollständig ✓`
              : `Aktiv (30T): ${stats.users.active30d} · ${gap} Profile fehlen!`;
          return (
            <StatCard
              title="Benutzer"
              value={stats.users.total}
              sub={sub}
              icon={gap === 0 ? 'persons' : 'exclamation_mark_triangle'}
              colorClass={gap === 0 ? 'text-primary' : 'text-danger'}
            />
          );
        })()}
        <StatCard
          title="Profile-Templates"
          value={stats.templates.total}
          sub={`Aktiv: ${stats.templates.active} · Inaktiv: ${stats.templates.inactive}`}
          icon="copy"
          colorClass="text-info"
        />
        <StatCard
          title="Admin-Aktivität"
          value={stats.adminActivity.logsLast7d}
          sub="Logs (letzte 7 Tage)"
          icon="counter_clockwise_clock"
          colorClass="text-warning"
        />
        {cur &&
          (() => {
            const { value, unit } = formatUptime(cur.uptime);
            return (
              <StatCard
                title="Serverlaufzeit"
                label={value}
                unit={unit}
                sub="seit letztem Start"
                icon="clock"
                colorClass="text-success"
              />
            );
          })()}
      </div>

      <div className="raster abstand-3">
        <div className="sp-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">Rollenverteilung</h6>
              {Object.entries(stats.users.byRole).map(([role, count]) => (
                <div key={role} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span className="small">{ROLE_LABELS[role] ?? role}</span>
                  <span className="badge bg-secondary rounded-pill">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sp-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">Ressourcenbestand</h6>
              {(
                [
                  [
                    'Bereitschaftseinsätze',
                    stats.resources.bereitschaftseinsaetze,
                    stats.growth.bereitschaftseinsaetzeLast7d,
                  ],
                  [
                    'Bereitschaftszeiträume',
                    stats.resources.bereitschaftszeitraeume,
                    stats.growth.bereitschaftszaetraumeLast7d,
                  ],
                  ['Einsatzwechseltätigkeiten', stats.resources.einsatzwechseltaetigkeiten, stats.growth.ewtLast7d],
                  ['Nebengeld-Einträge', stats.resources.nebengeld, stats.growth.nebengeldLast7d],
                  ['Entgeltausgleich-Einträge', stats.resources.entgeltausgleich, stats.growth.entgeltausgleichLast7d],
                ] as [string, number, number][]
              ).map(([label, count, growth]) => (
                <div key={label} className="d-flex justify-content-between align-items-start py-2 border-bottom gap-2">
                  <span className="small" style={{ minWidth: '0', wordBreak: 'break-word' }}>
                    {label}
                    {growth > 0 && <span className="badge bg-success-subtle text-success ms-1">+{growth}</span>}
                  </span>
                  <span className="badge bg-primary rounded-pill flex-shrink-0">{count.toLocaleString()}</span>
                </div>
              ))}
              <div className="text-body-secondary mt-2" style={{ fontSize: '.7rem' }}>
                +N = neue Einträge (7 Tage)
              </div>
            </div>
          </div>
        </div>

        <div className="sp-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">Auth-Aktivität</h6>
              {(
                [
                  ['Neue Benutzer (7T)', stats.auth.newUsersLast7d, 'person_add', 'text-success'],
                  ['E-Mail verifiziert', stats.auth.emailVerified, 'verified', 'text-primary'],
                  ['Passkey-Nutzer', stats.auth.passkeyUsers, 'fingerprint', 'text-info'],
                ] as [string, number, string, string][]
              ).map(([label, count, icon, color]) => (
                <div key={label} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span className="d-flex align-items-center gap-2 small">
                    <span className={`db-icon ${color} db-font-size-sm`} data-icon={icon} />
                    {label}
                  </span>
                  <span className="badge bg-secondary rounded-pill">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="raster mt-0 abstand-3">
        <div className="">
          <MemoryCard
            heap={heap}
            loading={heapLoading}
            days={heapDays}
            onDaysChange={changeHeapDays}
            onRefresh={() => void loadHeap()}
          />
        </div>
      </div>

      <div className="text-end mt-3">
        <button className="db-button" data-variant="outlined" data-size="small" onClick={load}>
          <span
            className="db-icon me-1 db-font-size-sm"
            data-icon="circular_arrows"
            style={{ verticalAlign: 'middle' }}
          />
          Aktualisieren
        </button>
      </div>
    </div>
  );
}
