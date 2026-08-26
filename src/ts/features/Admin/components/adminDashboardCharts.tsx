import { useEffect, useState } from 'preact/hooks';
import dayjs from '@/infrastructure/date/configDayjs';
import { triggerAdminHeapSnapshot, type MetricPoint, type HeapData } from '../utils/api';

export function formatUptime(seconds: number): { value: string; unit: string } {
  if (seconds < 3600) return { value: Math.round(seconds / 60).toString(), unit: 'Min.' };
  if (seconds < 86400) return { value: Math.round(seconds / 3600).toString(), unit: 'Std.' };
  const days = seconds / 86400;
  return { value: days.toFixed(days < 10 ? 1 : 0), unit: 'Tage' };
}

const EVENT_LABELS: Record<string, string> = {
  startup: 'Serverstart',
  shutdown: 'Herunterfahren',
  manual: 'Manuell',
  periodic: 'Intervall',
};

const EVENT_COLORS: Record<string, string> = {
  startup: 'var(--bs-warning)',
  shutdown: 'var(--bs-danger)',
  manual: 'var(--bs-success)',
  periodic: 'var(--bs-secondary)',
};

const ENV_LABELS: Record<string, string> = {
  gcp: 'GCP Cloud Run',
  homeserver: 'HomeServer',
};

const ENV_COLORS: Record<string, string> = {
  gcp: '#4285F4',
  homeserver: '#34A853',
};

function MemorySparkline({
  history,
  visibleEnvironments,
}: {
  history: MetricPoint[];
  visibleEnvironments: Set<'gcp' | 'homeserver'>;
}) {
  const filtered = history.filter(p => p.environment && visibleEnvironments.has(p.environment));

  if (filtered.length < 2) {
    return <div class="text-body-secondary small py-3 text-center">Noch keine Verlaufsdaten</div>;
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

  const toX = (t: number) => PX + ((t - tMin) / tRange) * cW;
  const toY = (v: number) => PT + (1 - v / vRange) * cH;

  const pts = (items: MetricPoint[], field: 'heapUsed' | 'rss') =>
    items.map(p => `${toX(dayjs(p.timestamp).valueOf()).toFixed(1)},${toY(p[field]).toFixed(1)}`).join(' ');

  // Nur Punkte derselben Server-Session verbinden – kein Strich über Downtime hinweg.
  // Fallback für Alt-Daten ohne sessionId: neues Segment bei jedem Startup-Event.
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

  // X-Achsen-Ticks: Intervall abhängig vom Zeitbereich
  const rangeH = tRange / 3_600_000;
  const tickH = rangeH <= 12 ? 2 : rangeH <= 48 ? 6 : rangeH <= 168 ? 24 : 48;
  const tickMs = tickH * 3_600_000;
  const firstTick = Math.ceil(tMin / tickMs) * tickMs;
  const ticks: number[] = [];
  for (let t = firstTick; t <= tMax; t += tickMs) ticks.push(t);

  const fmtTick = (t: number) => dayjs(t).format(tickH < 24 ? 'DD.MM HH:[00]' : 'DD.MM');

  const gcp = filtered.filter(p => p.environment === 'gcp');
  const home = filtered.filter(p => p.environment === 'homeserver');
  const gcpSegments = toSegments(gcp);
  const homeSegments = toSegments(home);
  const nonPeriodic = filtered.filter(p => p.event !== 'periodic');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style="width:100%;height:clamp(90px,16vw,180px);display:block" aria-hidden="true">
      {/* Achsen */}
      <line x1={PX} y1={PT} x2={PX} y2={H - PB} stroke="var(--bs-border-color)" strokeWidth="0.5" />
      <line x1={PX} y1={H - PB} x2={W - PX} y2={H - PB} stroke="var(--bs-border-color)" strokeWidth="0.5" />

      {/* X-Achsen-Beschriftung */}
      {ticks.map((t, i) => {
        const x = toX(t);
        return (
          <g key={i}>
            <line x1={x} y1={H - PB} x2={x} y2={H - PB + 3} stroke="var(--bs-border-color)" strokeWidth="0.5" />
            <text x={x} y={H - 2} fontSize="6" fill="var(--bs-body-color)" opacity="0.5" textAnchor="middle">
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

      <text x={PX + 2} y={PT + 8} fontSize="7" fill="var(--bs-body-color)" opacity="0.5">
        {vMax} MB
      </text>
    </svg>
  );
}

const EVENTS_PAGE_SIZE = 10;

const HEAP_RANGE_OPTIONS = [1, 3, 7, 14, 30] as const;

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

  useEffect(() => {
    setEventsPage(0);
  }, [heap]);

  function toggleEnvironment(env: 'gcp' | 'homeserver') {
    const newSet = new Set(visibleEnvironments);
    if (newSet.has(env)) {
      newSet.delete(env);
    } else {
      newSet.add(env);
    }
    setVisibleEnvironments(newSet);
  }

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
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        {/* ── Header ── */}
        <div class="d-flex align-items-center justify-content-between mb-2 gap-2">
          <h6 class="card-title fw-semibold mb-0 text-nowrap">
            <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
              memory
            </span>
            Memory-Verlauf
          </h6>
          <div class="d-flex gap-2 flex-shrink-0">
            <select
              class="form-select form-select-sm w-auto"
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
            </select>
            <button
              class="btn btn-sm btn-outline-success"
              onClick={takeSnapshot}
              disabled={snapping || loading}
              title="Manuellen Heap-Snapshot jetzt speichern"
            >
              {snapping ? (
                <span class="spinner-border spinner-border-sm" />
              ) : (
                <span class="material-icons-round" style="font-size:1rem;vertical-align:middle">
                  add_chart
                </span>
              )}
            </button>
            <button class="btn btn-sm btn-outline-secondary" onClick={onRefresh} disabled={loading}>
              <span class="material-icons-round" style="font-size:1rem;vertical-align:middle">
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* ── Environment Toggles ── */}
        <div class="mb-2 d-flex gap-2" style="font-size:.85rem">
          <label class="form-check">
            <input
              type="checkbox"
              class="form-check-input"
              checked={visibleEnvironments.has('gcp')}
              onChange={() => toggleEnvironment('gcp')}
            />
            <span class="form-check-label">
              <span
                style={`display:inline-block;width:8px;height:8px;background:#4285F4;border-radius:2px;margin-right:4px`}
              />
              GCP
            </span>
          </label>
          <label class="form-check">
            <input
              type="checkbox"
              class="form-check-input"
              checked={visibleEnvironments.has('homeserver')}
              onChange={() => toggleEnvironment('homeserver')}
            />
            <span class="form-check-label">
              <span
                style={`display:inline-block;width:8px;height:8px;background:#34A853;border-radius:2px;margin-right:4px`}
              />
              HomeServer
            </span>
          </label>
        </div>

        {loading && !heap ? (
          <div class="text-center py-3">
            <span class="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : (
          <>
            {/* ── Aktuelle Werte – eine kompakte Zeile ── */}
            {cur && (
              <div class="small text-body-secondary mb-2">
                <div class="mb-1">
                  {cur.environment && (
                    <span class="badge" style={`background-color: ${ENV_COLORS[cur.environment]}`}>
                      {ENV_LABELS[cur.environment]}
                    </span>
                  )}
                </div>
                <p class="mb-0">
                  <span class="fw-semibold text-primary">Heap</span> {cur.heapUsed}/{cur.heapTotal} MB
                  {' · '}
                  <span class="fw-semibold" style="color:var(--bs-orange)">
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
            <div class="d-flex gap-2 mt-1 flex-wrap" style="font-size:.72rem;color:var(--bs-secondary-color)">
              {(
                [
                  ['#34A853', false, 'HomeServer Heap'],
                  ['#34A853', false, 'HomeServer RSS', true],
                  ['#4285F4', false, 'GCP Heap'],
                  ['#4285F4', false, 'GCP RSS', true],
                  ['var(--bs-warning)', true, 'Serverstart'],
                  ['var(--bs-success)', true, 'Manuell'],
                  ['var(--bs-danger)', true, 'Shutdown'],
                ] as [string, boolean, string, boolean?][]
              ).map(([color, dashed, label, reduced]) => (
                <span key={label} class="d-flex align-items-center gap-1">
                  <span
                    style={`width:14px;height:${dashed ? '0' : '2px'};background:${dashed ? 'none' : color};border-top:${dashed ? `2px dashed ${color}` : 'none'};opacity:${reduced ? '.5' : '.85'};display:inline-block;flex-shrink:0`}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* ── Ereignisse ── */}
            {history.length > 0 && (
              <div class="mt-2 pt-2 border-top">
                <div class="small text-body-secondary mb-1">Ereignisse ({history.length}):</div>
                <ul class="list-unstyled mb-0">
                  {pagedEvents.map((p, i) => {
                    const icon =
                      p.event === 'startup' ? 'power_settings_new' : p.event === 'shutdown' ? 'power_off' : 'add_chart';
                    const ts = dayjs(p.timestamp).format('DD.MM., HH:mm');
                    return (
                      <li key={i} class="py-1 border-bottom">
                        <div class="d-flex align-items-center gap-2">
                          <span
                            class="material-icons-round flex-shrink-0"
                            style={`font-size:.85rem;color:${EVENT_COLORS[p.event]}`}
                          >
                            {icon}
                          </span>
                          <span class="small fw-medium" style={`color:${EVENT_COLORS[p.event]}`}>
                            {EVENT_LABELS[p.event]}
                          </span>
                          {p.environment && (
                            <span
                              class="badge ms-auto"
                              style={`background-color: ${ENV_COLORS[p.environment]};font-size:.7rem`}
                            >
                              {ENV_LABELS[p.environment].split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div class="text-body-secondary" style="font-size:.72rem;padding-left:1.6rem">
                          {ts} · {p.rss} MB RSS · {p.heapUsed} MB Heap
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {eventPageCount > 1 && (
                  <div class="d-flex align-items-center justify-content-between mt-2" style="font-size:.75rem">
                    <button
                      class="btn btn-sm btn-link p-0 text-body-secondary"
                      onClick={() => setEventsPage(p => Math.max(0, p - 1))}
                      disabled={eventsPage === 0}
                    >
                      <span class="material-icons-round" style="font-size:1rem;vertical-align:middle">
                        chevron_left
                      </span>
                    </button>
                    <span class="text-body-secondary">
                      {eventsPage + 1} / {eventPageCount}
                    </span>
                    <button
                      class="btn btn-sm btn-link p-0 text-body-secondary"
                      onClick={() => setEventsPage(p => Math.min(eventPageCount - 1, p + 1))}
                      disabled={eventsPage === eventPageCount - 1}
                    >
                      <span class="material-icons-round" style="font-size:1rem;vertical-align:middle">
                        chevron_right
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
