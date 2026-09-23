import { useState } from 'react';

import dayjs from '@/shared/lib/date/configDayjs';
import { triggerAdminHeapSnapshot, type MetricPoint, type HeapData } from '../api/api';
import { DBButton, DBCard, DBCheckbox, DBHeadingH6, DBTag, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl } from '@/shared/ui/form/DbFeld';
import { formatUptime } from '../model/formatUptime';

const EVENT_LABELS: Record<string, string> = {
  startup: 'Serverstart',
  shutdown: 'Herunterfahren',
  manual: 'Manuell',
  periodic: 'Intervall',
};

const EVENT_COLORS: Record<string, string> = {
  startup: 'var(--db-warning-origin-default)',
  shutdown: 'var(--db-critical-origin-default)',
  manual: 'var(--db-successful-origin-default)',
  periodic: 'var(--db-adaptive-on-bg-basic-emphasis-70-default)',
};

const ENV_LABELS: Record<string, string> = {
  gcp: 'GCP Cloud Run',
  homeserver: 'HomeServer',
};

const ENV_COLORS: Record<string, string> = {
  gcp: '#4285F4',
  homeserver: '#34A853',
};

/**
 * SVG-Verlaufsdiagramm für Heap (kräftig) und RSS (blass) je Umgebung mit Zeitachse und Ereignismarkern; zeigt bei weniger als zwei sichtbaren Messpunkten einen Hinweis.
 *
 * @param props - `history` (Messpunkte) und `visibleEnvironments` (eingeblendete Umgebungen).
 */
function MemorySparkline({
  history,
  visibleEnvironments,
}: {
  history: MetricPoint[];
  visibleEnvironments: Set<'gcp' | 'homeserver'>;
}) {
  const filtered = history.filter(p => p.environment && visibleEnvironments.has(p.environment));

  if (filtered.length < 2) {
    return <div className="text-body-secondary small py-3 text-center">Noch keine Verlaufsdaten</div>;
  }

  const W = 400,
    H = 98,
    PX = 6,
    PT = 6,
    PB = 18;
  const cW = W - 2 * PX,
    cH = H - PT - PB;

  const times = filtered.map(p => dayjs(p.timestamp).valueOf());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tRange = tMax - tMin || 1;
  const vMax = Math.max(...filtered.flatMap(p => [p.heapUsed, p.rss]));
  const vRange = vMax || 1;

  /**
   * Zeitstempel (ms) auf die x-Koordinate im Zeichenbereich abbilden.
   *
   * @param t - Zeitstempel in ms.
   * @returns x-Koordinate im viewBox-Raum.
   */
  const toX = (t: number) => PX + ((t - tMin) / tRange) * cW;
  /**
   * Speicherwert (MB) auf die y-Koordinate abbilden (0 unten, `vMax` oben).
   *
   * @param v - Wert in MB.
   * @returns y-Koordinate im viewBox-Raum.
   */
  const toY = (v: number) => PT + (1 - v / vRange) * cH;

  /**
   * Baut das `points`-Attribut einer Polyline für ein Metrikfeld.
   *
   * @param items - Messpunkte eines Segments.
   * @param field - `'heapUsed'` oder `'rss'`.
   * @returns Koordinatenpaare `x,y`, durch Leerzeichen getrennt.
   */
  const pts = (items: MetricPoint[], field: 'heapUsed' | 'rss') =>
    items.map(p => `${toX(dayjs(p.timestamp).valueOf()).toFixed(1)},${toY(p[field]).toFixed(1)}`).join(' ');

  /**
   * Teilt Messpunkte in zusammenhängende Segmente, damit keine Linie über Downtime hinweg gezeichnet
   * wird: neues Segment bei anderer `sessionId` und (Fallback für Altdaten ohne `sessionId`) bei jedem Startup-Event.
   *
   * @param items - Zeitlich sortierte Messpunkte einer Umgebung.
   * @returns Segmente, die je als eigene Polyline gezeichnet werden.
   */
  const toSegments = (items: MetricPoint[]): MetricPoint[][] => {
    const segments: MetricPoint[][] = [];
    for (const p of items) {
      const current = segments[segments.length - 1];
      const prev = current?.[current.length - 1];
      if (!prev || p.sessionId !== prev.sessionId || p.event === 'startup') segments.push([p]);
      else current.push(p);
    }
    return segments;
  };

  // X-Achsen-Ticks: Abstand (2/6/24/48 Std.) richtet sich nach der Spanne des Zeitbereichs
  const rangeH = tRange / 3_600_000;
  const tickH = rangeH <= 12 ? 2 : rangeH <= 48 ? 6 : rangeH <= 168 ? 24 : 48;
  const tickMs = tickH * 3_600_000;
  const firstTick = Math.ceil(tMin / tickMs) * tickMs;
  const ticks: number[] = [];
  for (let t = firstTick; t <= tMax; t += tickMs) ticks.push(t);

  /**
   * Formatiert einen Achsen-Tick: mit voller Stunde bei Abstand unter 24 Std., sonst nur das Datum.
   *
   * @param t - Zeitstempel in ms.
   * @returns Beschriftung des Ticks.
   */
  const fmtTick = (t: number) => dayjs(t).format(tickH < 24 ? 'DD.MM HH:[00]' : 'DD.MM');

  const gcp = filtered.filter(p => p.environment === 'gcp');
  const home = filtered.filter(p => p.environment === 'homeserver');
  const gcpSegments = toSegments(gcp);
  const homeSegments = toSegments(home);
  const nonPeriodic = filtered.filter(p => p.event !== 'periodic');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'clamp(90px,16vw,180px)', display: 'block' }}
      aria-hidden="true"
    >
      {/* Achsen */}
      <line
        x1={PX}
        y1={PT}
        x2={PX}
        y2={H - PB}
        stroke="var(--db-adaptive-on-bg-basic-emphasis-60-default)"
        strokeWidth="0.5"
      />
      <line
        x1={PX}
        y1={H - PB}
        x2={W - PX}
        y2={H - PB}
        stroke="var(--db-adaptive-on-bg-basic-emphasis-60-default)"
        strokeWidth="0.5"
      />

      {/* X-Achsen-Beschriftung */}
      {ticks.map((t, i) => {
        const x = toX(t);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={H - PB}
              x2={x}
              y2={H - PB + 3}
              stroke="var(--db-adaptive-on-bg-basic-emphasis-60-default)"
              strokeWidth="0.5"
            />
            <text
              x={x}
              y={H - 2}
              fontSize="6"
              fill="var(--db-adaptive-on-bg-basic-emphasis-100-default)"
              opacity="0.5"
              textAnchor="middle"
            >
              {fmtTick(t)}
            </text>
          </g>
        );
      })}

      {/* Ereignismarker */}
      {nonPeriodic.map((p, i) => {
        const x = toX(dayjs(p.timestamp).valueOf());
        return (
          <line
            key={i}
            x1={x}
            y1={PT}
            x2={x}
            y2={H - PB}
            stroke={EVENT_COLORS[p.event]}
            strokeWidth="1.5"
            strokeDasharray="4,3"
            opacity="0.8"
          />
        );
      })}

      {/* GCP – blau */}
      {visibleEnvironments.has('gcp') && gcp.length > 0 && (
        <>
          {gcpSegments.map((seg, i) => (
            <g key={i}>
              <polyline points={pts(seg, 'rss')} fill="none" stroke="#4285F4" strokeWidth="1" opacity="0.4" />
              <polyline points={pts(seg, 'heapUsed')} fill="none" stroke="#4285F4" strokeWidth="2" opacity="0.9" />
            </g>
          ))}
          {gcp.map((p, i) => (
            <circle
              key={i}
              cx={toX(dayjs(p.timestamp).valueOf())}
              cy={toY(p.heapUsed)}
              r="2.5"
              fill="#4285F4"
              opacity="0.9"
            />
          ))}
        </>
      )}

      {/* HomeServer – grün */}
      {visibleEnvironments.has('homeserver') && home.length > 0 && (
        <>
          {homeSegments.map((seg, i) => (
            <g key={i}>
              <polyline points={pts(seg, 'rss')} fill="none" stroke="#34A853" strokeWidth="1" opacity="0.4" />
              <polyline points={pts(seg, 'heapUsed')} fill="none" stroke="#34A853" strokeWidth="2" opacity="0.9" />
            </g>
          ))}
          {home.map((p, i) => (
            <circle
              key={i}
              cx={toX(dayjs(p.timestamp).valueOf())}
              cy={toY(p.heapUsed)}
              r="2.5"
              fill="#34A853"
              opacity="0.9"
            />
          ))}
        </>
      )}

      <text x={PX + 2} y={PT + 8} fontSize="7" fill="var(--db-adaptive-on-bg-basic-emphasis-100-default)" opacity="0.5">
        {vMax} MB
      </text>
    </svg>
  );
}

const EVENTS_PAGE_SIZE = 10;

const HEAP_RANGE_OPTIONS = [1, 3, 7, 14, 30] as const;

/**
 * Karte mit Memory-Verlauf (Heap/RSS) je Umgebung, Zeitraumwahl, manuellem Heap-Snapshot, Legende und paginierter Ereignisliste.
 *
 * @param props - `heap` (Daten oder `null`), `loading`, `days` (Zeitraum), `onDaysChange` und `onRefresh`.
 */
export function MemoryCard({
  heap,
  loading,
  days,
  onDaysChange,
  onRefresh,
}: {
  heap: HeapData | null;
  loading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
}) {
  const [snapping, setSnapping] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);
  const [visibleEnvironments, setVisibleEnvironments] = useState<Set<'gcp' | 'homeserver'>>(
    new Set(['gcp', 'homeserver']),
  );

  // Paginierung beim Datenwechsel in der Renderphase zurücksetzen (setState im Effect wäre
  // react-hooks/set-state-in-effect).
  const [prevHeap, setPrevHeap] = useState(heap);
  if (prevHeap !== heap) {
    setPrevHeap(heap);
    setEventsPage(0);
  }

  /**
   * Blendet eine Umgebung im Diagramm ein bzw. aus.
   *
   * @param env - Umgebung, deren Sichtbarkeit umgeschaltet wird.
   */
  function toggleEnvironment(env: 'gcp' | 'homeserver') {
    const newSet = new Set(visibleEnvironments);
    if (newSet.has(env)) {
      newSet.delete(env);
    } else {
      newSet.add(env);
    }
    setVisibleEnvironments(newSet);
  }

  /**
   * Löst einen manuellen Heap-Snapshot im Backend aus und lädt danach die Daten neu (`onRefresh`).
   */
  async function takeSnapshot() {
    setSnapping(true);
    try {
      await triggerAdminHeapSnapshot();
      onRefresh();
    } finally {
      setSnapping(false);
    }
  }

  const history = (heap?.history ?? [])
    .slice()
    .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());
  const eventPageCount = Math.ceil(history.length / EVENTS_PAGE_SIZE);
  const pagedEvents = history.slice(eventsPage * EVENTS_PAGE_SIZE, (eventsPage + 1) * EVENTS_PAGE_SIZE);
  const cur = heap?.current;

  const lastSnap = (heap?.history.length ?? 0) > 0 ? heap!.history[heap!.history.length - 1] : null;

  return (
    <DBCard className="border-0 shadow-sm">
      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between mb-2 gap-2">
        <DBHeadingH6 className="fw-semibold mb-0 text-nowrap">
          <span className="db-icon me-1 db-font-size-sm" data-icon="pulse_wave" style={{ verticalAlign: 'middle' }} />
          Memory-Verlauf
        </DBHeadingH6>
        <div className="d-flex gap-2 flex-shrink-0">
          <DbAuswahl
            beschriftung="Zeitraum des Memory-Verlaufs"
            dicht
            className="w-auto"
            value={days}
            disabled={loading}
            title="Zeitraum des Memory-Verlaufs"
            onChange={e => onDaysChange(Number((e.target as HTMLSelectElement).value))}
          >
            {HEAP_RANGE_OPTIONS.map(d => (
              <option key={d} value={d}>
                {d === 1 ? '24 Std.' : `${d} Tage`}
              </option>
            ))}
          </DbAuswahl>
          <DBButton
            type="button"
            variant="outlined"
            data-color="successful"
            size="small"
            icon="line_chart"
            showIcon={!snapping}
            noText
            onClick={takeSnapshot}
            disabled={snapping || loading}
          >
            <DBTooltip>Manuellen Heap-Snapshot jetzt speichern</DBTooltip>
            {snapping && <span className="laedt" data-size="small" />}
          </DBButton>
          <DBButton
            type="button"
            variant="outlined"
            size="small"
            icon="circular_arrows"
            noText
            onClick={onRefresh}
            disabled={loading}
          >
            <DBTooltip>Aktualisieren</DBTooltip>
          </DBButton>
        </div>
      </div>

      {/* ── Environment Toggles ── */}
      <div className="mb-2 d-flex gap-2" style={{ fontSize: '.85rem' }}>
        <DBCheckbox size="small" checked={visibleEnvironments.has('gcp')} onChange={() => toggleEnvironment('gcp')}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: '#4285F4',
              borderRadius: '2px',
              marginRight: '4px',
            }}
          />
          GCP
        </DBCheckbox>
        <DBCheckbox
          size="small"
          checked={visibleEnvironments.has('homeserver')}
          onChange={() => toggleEnvironment('homeserver')}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: '#34A853',
              borderRadius: '2px',
              marginRight: '4px',
            }}
          />
          HomeServer
        </DBCheckbox>
      </div>

      {loading && !heap ? (
        <div className="text-center py-3">
          <span className="laedt text-primary" data-size="small" />
        </div>
      ) : (
        <>
          {/* ── Aktuelle Werte – eine kompakte Zeile ── */}
          {cur && (
            <div className="small text-body-secondary mb-2">
              <div className="mb-1">
                {cur.environment && (
                  <DBTag style={{ backgroundColor: ENV_COLORS[cur.environment] }}>{ENV_LABELS[cur.environment]}</DBTag>
                )}
              </div>
              <p className="mb-0">
                <span className="fw-semibold text-primary">Heap</span> {cur.heapUsed}/{cur.heapTotal} MB
                {' · '}
                <span className="fw-semibold" style={{ color: 'var(--db-warning-origin-default)' }}>
                  RSS
                </span>{' '}
                {cur.rss} MB
                {' · '}Extern {cur.external} MB
                {lastSnap && (
                  <>
                    {' · '}Loop {lastSnap.eventLoopDelay} ms · Uptime {formatUptime(lastSnap.uptime).value}{' '}
                    {formatUptime(lastSnap.uptime).unit}
                  </>
                )}
              </p>
            </div>
          )}

          {/* ── Chart ── */}
          <MemorySparkline history={heap?.history ?? []} visibleEnvironments={visibleEnvironments} />

          {/* ── Legende ── */}
          <div
            className="d-flex gap-2 mt-1 flex-wrap"
            style={{ fontSize: '.72rem', color: 'var(--db-adaptive-on-bg-basic-emphasis-70-default)' }}
          >
            {(
              [
                ['#34A853', false, 'HomeServer Heap'],
                ['#34A853', false, 'HomeServer RSS', true],
                ['#4285F4', false, 'GCP Heap'],
                ['#4285F4', false, 'GCP RSS', true],
                ['var(--db-warning-origin-default)', true, 'Serverstart'],
                ['var(--db-successful-origin-default)', true, 'Manuell'],
                ['var(--db-critical-origin-default)', true, 'Shutdown'],
              ] as [string, boolean, string, boolean?][]
            ).map(([color, dashed, label, reduced]) => (
              <span key={label} className="d-flex align-items-center gap-1">
                <span
                  style={{
                    width: '14px',
                    height: dashed ? '0' : '2px',
                    background: dashed ? 'none' : color,
                    borderTop: dashed ? `2px dashed ${color}` : 'none',
                    opacity: reduced ? '.5' : '.85',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* ── Ereignisse ── */}
          {history.length > 0 && (
            <div className="mt-2 pt-2 border-top">
              <div className="small text-body-secondary mb-1">Ereignisse ({history.length}):</div>
              <ul className="list-unstyled mb-0">
                {pagedEvents.map((p, i) => {
                  const icon = p.event === 'startup' ? 'start' : p.event === 'shutdown' ? 'stop' : 'line_chart';
                  const ts = dayjs(p.timestamp).format('DD.MM., HH:mm');
                  return (
                    <li key={i} className="py-1 border-bottom">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="db-icon flex-shrink-0 db-font-size-xs"
                          data-icon={icon}
                          style={{ color: EVENT_COLORS[p.event] }}
                        />
                        <span className="small fw-medium" style={{ color: EVENT_COLORS[p.event] }}>
                          {EVENT_LABELS[p.event]}
                        </span>
                        {p.environment && (
                          <DBTag
                            className="ms-auto"
                            style={{ backgroundColor: ENV_COLORS[p.environment], fontSize: '.7rem' }}
                          >
                            {ENV_LABELS[p.environment].split(' ')[0]}
                          </DBTag>
                        )}
                      </div>
                      <div className="text-body-secondary" style={{ fontSize: '.72rem', paddingLeft: '1.6rem' }}>
                        {ts} · {p.rss} MB RSS · {p.heapUsed} MB Heap
                      </div>
                    </li>
                  );
                })}
              </ul>
              {eventPageCount > 1 && (
                <div className="d-flex align-items-center justify-content-between mt-2" style={{ fontSize: '.75rem' }}>
                  <DBButton
                    type="button"
                    className="p-0 text-body-secondary"
                    variant="ghost"
                    size="small"
                    icon="chevron_left"
                    noText
                    onClick={() => setEventsPage(p => Math.max(0, p - 1))}
                    disabled={eventsPage === 0}
                  >
                    <DBTooltip>Vorherige Seite</DBTooltip>
                  </DBButton>
                  <span className="text-body-secondary">
                    {eventsPage + 1} / {eventPageCount}
                  </span>
                  <DBButton
                    type="button"
                    className="p-0 text-body-secondary"
                    variant="ghost"
                    size="small"
                    icon="chevron_right"
                    noText
                    onClick={() => setEventsPage(p => Math.min(eventPageCount - 1, p + 1))}
                    disabled={eventsPage === eventPageCount - 1}
                  >
                    <DBTooltip>Nächste Seite</DBTooltip>
                  </DBButton>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DBCard>
  );
}
