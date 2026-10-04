import Illustration, { type IllustrationName } from '@/shared/ui/icons/Illustration';
import { useEffect, useState } from 'react';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import { useAdminFeatures } from '../adminFeatures';
import { fetchAdminStats, fetchAdminHeap, type AdminStats, type HeapData } from '../api/api';
import { MemoryCard } from './adminDashboardCharts';
import { formatUptime } from '../model/formatUptime';
import {
  DBButton,
  DBCard,
  DBHeadingH6,
  DBInfotext,
  DBLoadingIndicator,
  DBNotification,
  DBStack,
  DBTag,
} from '@db-ux/react-core-components';

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
  illustration,
  colorClass,
}: {
  title: string;
  value?: number;
  label?: string;
  unit?: string;
  sub?: string;
  icon: string;
  /** Illustration bei aktiven DB-Assets; `icon` ist dann nur der Ersatz (freie Variante). */
  illustration: IllustrationName;
  colorClass: string;
}) {
  const display = label ?? value?.toLocaleString() ?? '–';
  return (
    <div className="sp-sm-6 sp-xl-3">
      <DBCard className="admin-karte">
        <DBStack direction="row" gap="small" alignment="start">
          <Illustration name={illustration} ersatz={icon} className={`${colorClass} db-font-size-lg`} />
          <div style={{ minWidth: '0' }}>
            <DBInfotext showIcon={false} className="infotext-block">
              {title}
            </DBInfotext>
            <strong className="kennzahl-wert">
              {display}
              {unit && <span className="kennzahl-einheit">{unit}</span>}
            </strong>
            {sub && (
              <DBInfotext showIcon={false} className="infotext-block">
                {sub}
              </DBInfotext>
            )}
          </div>
        </DBStack>
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
      <div className="admin-laden">
        <DBLoadingIndicator showLabel={false}>Wird geladen…</DBLoadingIndicator>
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
      <div className="raster admin-block abstand-3">
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
              illustration={gap === 0 ? 'account' : 'error'}
              colorClass={gap === 0 ? 'farbe-primary' : 'farbe-gefahr'}
            />
          );
        })()}
        <StatCard
          title="Profile-Templates"
          value={stats.templates.total}
          sub={`Aktiv: ${stats.templates.active} · Inaktiv: ${stats.templates.inactive}`}
          icon="copy"
          illustration="user_manual"
          colorClass="farbe-info"
        />
        <StatCard
          title="Admin-Aktivität"
          value={stats.adminActivity.logsLast7d}
          sub="Logs (letzte 7 Tage)"
          icon="counter_clockwise_clock"
          illustration="cyber_security"
          colorClass="farbe-warnung"
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
                illustration="alarm_clock"
                colorClass="farbe-erfolg"
              />
            );
          })()}
      </div>

      <div className="raster admin-block abstand-3">
        <div className="sp-md-4">
          <DBCard className="admin-karte">
            <DBHeadingH6 paragraphSpacing>Rollenverteilung</DBHeadingH6>
            {Object.entries(stats.users.byRole).map(([role, count]) => (
              <DBStack
                key={role}
                direction="row"
                alignment="center"
                justifyContent="space-between"
                className="kennzahl-zeile"
              >
                <DBInfotext showIcon={false}>{ROLE_LABELS[role as Role] ?? role}</DBInfotext>
                <DBTag semantic="neutral" emphasis="strong">
                  {count}
                </DBTag>
              </DBStack>
            ))}
          </DBCard>
        </div>

        <div className="sp-md-4">
          <DBCard className="admin-karte">
            <DBHeadingH6 paragraphSpacing>Ressourcenbestand</DBHeadingH6>
            {(
              adminFeatures
                .flatMap(feature => feature.statsRows)
                .map(row => [row.label, stats.resources[row.countKey], stats.growth[row.growthKey]]) as [
                string,
                number,
                number,
              ][]
            ).map(([label, count, growth]) => (
              <DBStack
                key={label}
                direction="row"
                alignment="start"
                justifyContent="space-between"
                gap="x-small"
                className="kennzahl-zeile"
              >
                <DBInfotext showIcon={false} className="kennzahl-beschriftung">
                  {label}
                  {growth > 0 && (
                    <DBTag className="kennzahl-zuwachs" semantic="successful">
                      +{growth}
                    </DBTag>
                  )}
                </DBInfotext>
                <DBTag className="nicht-schrumpfen" semantic="informational" emphasis="strong">
                  {count.toLocaleString()}
                </DBTag>
              </DBStack>
            ))}
            <DBInfotext showIcon={false} className="infotext-block kennzahl-fussnote">
              +N = neue Einträge (7 Tage)
            </DBInfotext>
          </DBCard>
        </div>

        <div className="sp-md-4">
          <DBCard className="admin-karte">
            <DBHeadingH6 paragraphSpacing>Auth-Aktivität</DBHeadingH6>
            {(
              [
                ['Neue Benutzer (7T)', stats.auth.newUsersLast7d, 'person', 'farbe-erfolg'],
                ['E-Mail verifiziert', stats.auth.emailVerified, 'envelope', 'farbe-primary'],
                ['Passkey-Nutzer', stats.auth.passkeyUsers, 'fingerprint', 'farbe-info'],
              ] as [string, number, string, string][]
            ).map(([label, count, icon, color]) => (
              <DBStack
                key={label}
                direction="row"
                alignment="center"
                justifyContent="space-between"
                className="kennzahl-zeile"
              >
                <DBStack direction="row" alignment="center" gap="x-small">
                  <span className={`db-icon ${color} db-font-size-sm`} data-icon={icon} />
                  <DBInfotext showIcon={false}>{label}</DBInfotext>
                </DBStack>
                <DBTag semantic="neutral" emphasis="strong">
                  {count}
                </DBTag>
              </DBStack>
            ))}
          </DBCard>
        </div>
      </div>

      <div className="raster abstand-3">
        <div>
          <MemoryCard
            heap={heap}
            loading={heapLoading}
            days={heapDays}
            onDaysChange={changeHeapDays}
            onRefresh={() => void loadHeap()}
          />
        </div>
      </div>

      <div className="admin-rechts">
        <DBButton type="button" variant="outlined" size="small" icon="circular_arrows" onClick={load}>
          Aktualisieren
        </DBButton>
      </div>
    </div>
  );
}
