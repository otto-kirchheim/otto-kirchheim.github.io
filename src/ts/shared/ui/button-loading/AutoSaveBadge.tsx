import { DBBadge, DBIcon, type SemanticType } from '@db-ux/react-core-components';
import { useEffect, useState, type FC } from 'react';

import useAutoSaveStatus from '@/shared/lib/autosave/useAutoSaveStatus';
import type { TResourceKey, TSaveStatus } from '@/types';

/** Icon (DB UX, `data-icon`) je Status; `idle` hat keins, das Badge bleibt dann unsichtbar. */
const ICON_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'cloud',
  saving: 'cloud_upload',
  saved: 'check_circle',
  error: 'exclamation_mark_circle',
  blocked: 'exclamation_mark_triangle',
};

const ICON_OFFLINE = 'wifi_disabled';

const SEMANTIK_MAP: Record<TSaveStatus, SemanticType | undefined> = {
  idle: undefined,
  pending: 'neutral',
  saving: 'informational',
  saved: 'successful',
  error: 'critical',
  blocked: 'warning',
};

const TOOLTIP_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'Änderungen warten…',
  saving: 'Wird gespeichert…',
  saved: 'Gespeichert',
  error: 'Speichern fehlgeschlagen!',
  blocked: 'Überschneidung mit ungespeicherter Löschung – bitte manuell speichern',
};

const NETWORK_ERROR_PATTERNS = [
  'Server nicht Erreichbar',
  'Fetch-Fehler',
  'Keine Internetverbindung',
  'NetworkError',
  'Failed to fetch',
];

/**
 * Prueft, ob eine AutoSave-Fehlermeldung auf ein Netzwerk-/Erreichbarkeitsproblem hindeutet.
 *
 * @param msg - Fehlermeldung aus dem AutoSave-Status.
 * @returns `true`, wenn die Meldung eines der `NETWORK_ERROR_PATTERNS` enthaelt.
 */
function isNetworkError(msg: string): boolean {
  return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p));
}

type TAutoSaveBadge = {
  resources: readonly TResourceKey[];
};

/**
 * AutoSave-Status als Badge in der Ecke eines Buttons; `DBLoadingButton` rendert es, wenn
 * `autoSaveResources` gesetzt ist.
 *
 * `DBIcon` bekommt `text` statt `children`, damit seine `.db-icon`-Huelle nicht DOM-`:empty`
 * ist (das Glyph sitzt im `::before`): sonst trifft `.db-badge > span:empty` (fuer den reinen
 * Punkt-Badge gedacht) versehentlich das Icon, zwingt es auf `--badge-size` und verschiebt das
 * Glyph aus der Mitte. Der String bleibt wegen `font-size: 0` der `.db-icon` unsichtbar.
 *
 * Icons (DB UX, `data-icon`):
 * - idle:             kein Badge sichtbar
 * - pending:          cloud                       (grau)
 * - pending+offline:  wifi_disabled               (gelb) -- Änderungen warten auf Verbindung
 * - saving:           cloud_upload                (blau, pulse-Animation)
 * - saved:            check_circle                (grün, verblasst nach 2 s)
 * - error (Daten):    exclamation_mark_circle     (rot)
 * - error (Netzwerk): wifi_disabled               (rot)  -- Server nicht erreichbar
 * - blocked:          exclamation_mark_triangle   (gelb) -- Überschneidung mit ungespeicherter Löschung
 *
 * Props: `resources`: die beobachteten Ressourcen, deren AutoSave-Status angezeigt wird.
 */
const AutoSaveBadge: FC<TAutoSaveBadge> = ({ resources }) => {
  const { status, errorMessages, offline } = useAutoSaveStatus(resources);

  // "saved" verblasst nach 2 s -- rein lokaler UI-Zustand, unabhaengig vom Store (Business-Status
  // vs. UI-Timing).
  const [faded, setFaded] = useState(false);
  // Reset beim Status-Wechsel in der Render-Phase (React-Docs: "adjusting state when props
  // change"); ein synchrones setState im Effect verletzt `react-hooks/set-state-in-effect`.
  const [prevStatus, setPrevStatus] = useState(status);
  if (prevStatus !== status) {
    setPrevStatus(status);
    setFaded(false);
  }
  useEffect(() => {
    if (status !== 'saved') return undefined;
    const timer = setTimeout(() => setFaded(true), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const icon = ICON_MAP[status];
  const visible = !faded && !!icon;

  let iconName = icon;
  let semantic = SEMANTIK_MAP[status];
  let title = TOOLTIP_MAP[status];

  if (status === 'error') {
    const allNetwork = errorMessages.length > 0 && errorMessages.every(isNetworkError);
    iconName = allNetwork ? ICON_OFFLINE : 'exclamation_mark_circle';
    title = errorMessages.length > 0 ? errorMessages.join('\n') : TOOLTIP_MAP.error;
  } else if (status === 'pending' && offline) {
    iconName = ICON_OFFLINE;
    semantic = 'warning';
    title = 'Offline – Änderungen werden bei Verbindung gespeichert';
  }

  return (
    <DBBadge
      className={`autosave-badge${status === 'saving' ? ' autosave-pulse' : ''}`}
      placement="corner-top-right"
      emphasis="strong"
      semantic={semantic}
      label={visible ? title : undefined}
      title={visible ? title : undefined}
      style={{ transition: 'opacity 0.3s ease', opacity: visible ? 1 : 0 }}
    >
      <DBIcon icon={visible ? iconName : undefined} text={visible ? title : undefined} aria-hidden="true" />
    </DBBadge>
  );
};

export default AutoSaveBadge;
