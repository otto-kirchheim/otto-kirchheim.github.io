import { useEffect, useState } from 'react';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import { useAdminFeatures } from '../adminFeatures';
import { fetchAdminStats, fetchAdminHeap, type AdminStats, type HeapData } from '../utils/api';
import { MemoryCard } from './adminDashboardCharts';
import { formatUptime } from '../utils/formatUptime';
import { DBButton, DBCard, DBHeadingH6, DBNotification, DBStack, DBTag } from '@db-ux/react-core-components';

const ROLE_LABELS: Record<Role, string> = {
  [Role.MEMBER]: 'Mitglied',
  [Role.TEAM_ADMIN]: 'Team-Admin',
  [Role.ORG_ADMIN]: 'Org-Admin',
  [Role.SUPER_ADMIN]: 'Super-Admin',
};

/**
 * Kennzahl-Kachel des Dashboards; ohne `label` und `value` erscheint "–".
 *
 * @param props - `title`, Kennzahl als `value` oder Freitext `label` (Vorrang), optional `unit`/`sub`, `icon` und `colorClass` des Icons.
 */
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
      <DBCard className="border-0 shadow-sm h-100">
        <div className="d-flex gap-3 align-items-start">
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
      </DBCard>
    </div>
  );
}

/**
 * Admin-Dashboard: Benutzer-, Template-, Ressourcen- und Auth-Kennzahlen sowie Server-Speicherverlauf (MemoryCard).
 */
export function AdminDashboard() {
  // Zeilen der Karte "Ressourcenbestand" kommen aus den Admin-Anteilen der Features.
  const { features: adminFeatures } = useAdminFeatures();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [heap, setHeap] = useState<HeapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heapLoading, setHeapLoading] = useState(false);
  const [heapDays, setHeapDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lädt den Heap-Verlauf neu und setzt dabei den Lade-Indikator der Speicherkarte.
   *
   * @param days - Zeitraum in Tagen; Standard ist der aktuell gewählte.
   * @returns Promise, das nach dem Laden erfüllt ist (Fehler werden verschluckt, der alte Stand bleibt).
   */
  function loadHeap(days = heapDays) {
    setHeapLoading(true);
    return fetchAdminHeap(days)
      .then(setHeap)
      .catch(() => {})
      .finally(() => setHeapLoading(false));
  }

  /**
   * Übernimmt einen neuen Heap-Zeitraum und lädt die Daten dafür.
   *
   * @param days - Neuer Zeitraum in Tagen.
   */
  function changeHeapDays(days: number) {
    setHeapDays(days);
    void loadHeap(days);
  }

  // Initiales Laden: die setStates laufen bewusst erst in den Promise-Callbacks (asynchron) --
  // `loading`/`error` starten als true/null, ein synchrones setState im Effect waere ein
  // react-hooks/set-state-in-effect. `load` ist der separate Handler fuer den Refresh-Button.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminStats(), fetchAdminHeap(heapDays)])
      .then(([s, h]) => {
        if (cancelled) return;
        setStats(s);
        setHeap(h);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // heapDays ist bewusst keine Dep: ein Zeitraum-Wechsel laedt den Heap separat ueber
    // changeHeapDays -> loadHeap; dieser Effect laedt nur initial stats + heap zusammen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Lädt Kennzahlen und Heap komplett neu (Aktualisieren-/Neu-laden-Button).
   */
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="laedt text-primary" role="status">
          <span className="visually-hidden">Wird geladen…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DBNotification semantic="critical">
        <DBStack direction="row" alignment="center" justifyContent="space-between" gap="x-small">
          <span>{error}</span>
          <DBButton type="button" variant="outlined" data-color="critical" size="small" onClick={load}>
            Neu laden
          </DBButton>
        </DBStack>
      </DBNotification>
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

      <div className="raster mb-4 abstand-3">
        <div className="sp-md-4">
          <DBCard className="border-0 shadow-sm h-100">
            <DBHeadingH6 className="fw-semibold mb-3">Rollenverteilung</DBHeadingH6>
            {Object.entries(stats.users.byRole).map(([role, count]) => (
              <div key={role} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="small">{ROLE_LABELS[role as Role] ?? role}</span>
                <DBTag semantic="neutral" emphasis="strong">
                  {count}
                </DBTag>
              </div>
            ))}
          </DBCard>
        </div>

        <div className="sp-md-4">
          <DBCard className="border-0 shadow-sm h-100">
            <DBHeadingH6 className="fw-semibold mb-3">Ressourcenbestand</DBHeadingH6>
            {(
              adminFeatures
                .flatMap(feature => feature.statsRows)
                .map(row => [row.label, stats.resources[row.countKey], stats.growth[row.growthKey]]) as [
                string,
                number,
                number,
              ][]
            ).map(([label, count, growth]) => (
              <div key={label} className="d-flex justify-content-between align-items-start py-2 border-bottom gap-2">
                <span className="small" style={{ minWidth: '0', wordBreak: 'break-word' }}>
                  {label}
                  {growth > 0 && (
                    <DBTag className="text-success ms-1" semantic="successful">
                      +{growth}
                    </DBTag>
                  )}
                </span>
                <DBTag className="flex-shrink-0" semantic="informational" emphasis="strong">
                  {count.toLocaleString()}
                </DBTag>
              </div>
            ))}
            <div className="text-body-secondary mt-2" style={{ fontSize: '.7rem' }}>
              +N = neue Einträge (7 Tage)
            </div>
          </DBCard>
        </div>

        <div className="sp-md-4">
          <DBCard className="border-0 shadow-sm h-100">
            <DBHeadingH6 className="fw-semibold mb-3">Auth-Aktivität</DBHeadingH6>
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
                <DBTag semantic="neutral" emphasis="strong">
                  {count}
                </DBTag>
              </div>
            ))}
          </DBCard>
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
        <DBButton type="button" variant="outlined" size="small" icon="circular_arrows" onClick={load}>
          Aktualisieren
        </DBButton>
      </div>
    </div>
  );
}
