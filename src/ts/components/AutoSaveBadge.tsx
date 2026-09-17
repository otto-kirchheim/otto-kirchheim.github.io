import { useEffect, useState, type FC } from 'react';

import useAutoSaveStatus from '@/infrastructure/autoSave/useAutoSaveStatus';
import type { TResourceKey, TSaveStatus } from '@/types';

/**
 * AutoSave-Status als Badge in der Ecke eines Buttons -- deklarativer Nachfolger von
 * `autoSaveIndicator.ts`s `updateBadge()`. Wird von `DBLoadingButton` gerendert, wenn
 * `autoSaveResources` gesetzt ist.
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
 */

const ICON_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'cloud',
  saving: 'cloud_upload',
  saved: 'check_circle',
  error: 'exclamation_mark_circle',
  blocked: 'exclamation_mark_triangle',
};

const ICON_OFFLINE = 'wifi_disabled';

const SEMANTIK_MAP: Record<TSaveStatus, string | undefined> = {
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

function isNetworkError(msg: string): boolean {
  return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p));
}

type TAutoSaveBadge = {
  resources: readonly TResourceKey[];
};

const AutoSaveBadge: FC<TAutoSaveBadge> = ({ resources }) => {
  const { status, errorMessages, offline } = useAutoSaveStatus(resources);

  // "saved" verblasst nach 2s -- rein lokaler UI-Zustand, unabhaengig vom Store (Trennung
  // Business-Status vs. UI-Timing, siehe autoSaveStatusStore.ts).
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    setFaded(false);
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
    <span
      className={`autosave-badge db-badge${status === 'saving' ? ' autosave-pulse' : ''}`}
      data-placement="corner-top-right"
      data-emphasis="strong"
      data-semantic={semantic}
      title={visible ? title : undefined}
      style={{ transition: 'opacity 0.3s ease', opacity: visible ? 1 : 0 }}
    >
      <span className="db-icon" data-icon={visible ? iconName : undefined} aria-hidden="true" />
    </span>
  );
};

export default AutoSaveBadge;
