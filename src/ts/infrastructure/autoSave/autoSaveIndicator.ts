/**
 * AutoSave Status-Indicator: Zeigt den Auto-Save-Status als Badge an jedem
 * Speichern-Button. Jeder Button zeigt den Worst-Case-Status seiner
 * zugeordneten Ressourcen.
 *
 * Icons (Material Icons):
 * - idle:            kein Badge sichtbar
 * - pending:         cloud_queue  (grau)
 * - pending+offline: cloud_off    (gelb) – Änderungen warten auf Verbindung
 * - saving:          cloud_sync   (blau, pulse-Animation)
 * - saved:           cloud_done   (grün, verblasst nach 2 s)
 * - error (Daten):   error        (rot)  – z. B. 422 Validierungsfehler
 * - error (Netzwerk): cloud_off   (rot)  – Server nicht erreichbar
 */

import { onAutoSaveStatus } from './autoSave';
import type { TResourceKey, TSaveStatus } from '@/types';

/** Mapping: Button-ID → zugehörige Ressourcen */
const BUTTON_RESOURCE_MAP: ReadonlyArray<{ buttonId: string; resources: TResourceKey[] }> = [
  { buttonId: 'btnSaveB', resources: ['BZ', 'BE'] },
  { buttonId: 'btnSaveE', resources: ['EWT'] },
  { buttonId: 'btnSaveN', resources: ['N'] },
  { buttonId: 'btnSaveEinstellungen', resources: ['settings'] },
];

const ICON_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'cloud_queue',
  saving: 'cloud_sync',
  saved: 'cloud_done',
  error: 'error',
};

const BG_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'bg-secondary',
  saving: 'bg-info',
  saved: 'bg-success',
  error: 'bg-danger',
};

const TOOLTIP_MAP: Record<TSaveStatus, string> = {
  idle: '',
  pending: 'Änderungen warten…',
  saving: 'Wird gespeichert…',
  saved: 'Gespeichert',
  error: 'Speichern fehlgeschlagen!',
};

// ─── State ───────────────────────────────────────────────

/** Aktueller Status pro Ressource */
let currentStatuses: Map<string, TSaveStatus> = new Map();

/** Fehlermeldungen pro Ressource */
const errorMessages: Map<string, string> = new Map();

/** Badge-Elemente pro Button-ID */
const badgeElements: Map<string, HTMLSpanElement> = new Map();

/** Fade-Timer pro Button-ID */
const fadeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/** Unsubscribe-Funktion des Status-Listeners */
let unsubscribe: (() => void) | null = null;

/** Online/Offline-Event-Handler-Referenz */
let onlineOfflineHandler: (() => void) | null = null;

// ─── Hilfsfunktionen ─────────────────────────────────────

/** Worst-Case-Status ermitteln (Priorität: error > saving > pending > saved > idle) */
function worstStatus(resources: TResourceKey[]): TSaveStatus {
  const priority: TSaveStatus[] = ['error', 'saving', 'pending', 'saved', 'idle'];
  for (const prio of priority) {
    for (const res of resources) {
      if (currentStatuses.get(res) === prio) return prio;
    }
  }
  return 'idle';
}

/** Netzwerk-/Server-Fehlermuster erkennen */
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

function createBadgeElement(): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'autosave-badge position-absolute top-0 start-100 translate-middle badge rounded-pill';
  badge.style.transition = 'opacity 0.3s ease';
  badge.style.opacity = '0';

  const iconEl = document.createElement('span');
  iconEl.className = 'material-icons-round';
  badge.appendChild(iconEl);

  return badge;
}

function getOrCreateBadge(buttonId: string): HTMLSpanElement | null {
  const btn = document.getElementById(buttonId);
  if (!btn) {
    console.warn(`[Badge ${Date.now()}ms] getOrCreateBadge: Button ${buttonId} nicht gefunden`);
    return null;
  }

  let badge = badgeElements.get(buttonId);

  if (!badge || !badge.isConnected || !btn.contains(badge)) {
    const existing = btn.querySelector<HTMLSpanElement>('.autosave-badge');
    if (existing) {
      badge = existing;
      badgeElements.set(buttonId, badge);
    } else {
      badge = createBadgeElement();
      btn.classList.add('position-relative');
      btn.appendChild(badge);
      badgeElements.set(buttonId, badge);
    }
  }

  return badge;
}

/** Badge eines Buttons aktualisieren */
function updateBadge(buttonId: string, resources: TResourceKey[]): void {
  const badge = getOrCreateBadge(buttonId);
  if (!badge) return;

  const status = worstStatus(resources);
  const icon = ICON_MAP[status];

  // Vorherigen Fade-Timer löschen
  const prevTimer = fadeTimers.get(buttonId);
  if (prevTimer) {
    clearTimeout(prevTimer);
    fadeTimers.delete(buttonId);
  }

  if (!icon || status === 'idle') {
    badge.style.opacity = '0';
    badge.removeAttribute('title');
    return;
  }

  // Hintergrund-Klassen bereinigen
  badge.classList.remove(...Object.values(BG_MAP).filter(Boolean));
  badge.classList.remove('autosave-pulse');

  const iconEl = badge.querySelector<HTMLSpanElement>('.material-icons-round');

  const bg = BG_MAP[status];
  if (bg) badge.classList.add(bg);
  badge.style.opacity = '1';

  // Bei error: Icon + Tooltip nach Fehlerart differenzieren
  if (status === 'error') {
    const errors = resources
      .filter(r => currentStatuses.get(r) === 'error' && errorMessages.has(r))
      .map(r => errorMessages.get(r)!);

    const allNetwork = errors.length > 0 && errors.every(isNetworkError);
    if (iconEl) iconEl.textContent = allNetwork ? 'cloud_off' : 'error';
    badge.title = errors.length > 0 ? errors.join('\n') : TOOLTIP_MAP[status];
  } else if (status === 'pending' && !navigator.onLine) {
    // Offline: pending-Änderungen mit cloud_off kennzeichnen
    badge.classList.remove(bg);
    badge.classList.add('bg-warning');
    if (iconEl) iconEl.textContent = 'cloud_off';
    badge.title = 'Offline – Änderungen werden bei Verbindung gespeichert';
  } else {
    if (iconEl) iconEl.textContent = icon;
    badge.title = TOOLTIP_MAP[status];
  }

  if (status === 'saving') {
    badge.classList.add('autosave-pulse');
  }

  // Bei "saved": nach 2 s verblassen
  if (status === 'saved') {
    const timer = setTimeout(() => {
      for (const res of resources) {
        if (currentStatuses.get(res) === 'saved') currentStatuses.set(res, 'idle');
      }
      updateBadge(buttonId, resources);
      fadeTimers.delete(buttonId);
    }, 2000);
    fadeTimers.set(buttonId, timer);
  }
}

// ─── Öffentliche API ─────────────────────────────────────

/**
 * Initialisiert die AutoSave-Badges an allen Speichern-Buttons.
 * Sollte einmal nach dem Login aufgerufen werden.
 */
export function initAutoSaveIndicator(): void {
  if (badgeElements.size > 0) return; // Bereits initialisiert

  for (const { buttonId, resources } of BUTTON_RESOURCE_MAP) {
    const btn = document.getElementById(buttonId);
    if (!btn) continue;

    // Button muss position-relative haben für absolute Badge-Positionierung
    btn.classList.add('position-relative');

    // Badge-Element erstellen (oder bestehendes übernehmen)
    const existing = btn.querySelector<HTMLSpanElement>('.autosave-badge');
    const badge = existing ?? createBadgeElement();
    if (!existing) btn.appendChild(badge);
    badgeElements.set(buttonId, badge);

    // Initialen Status setzen
    updateBadge(buttonId, resources);
  }

  // Globalen Status-Listener registrieren
  unsubscribe = onAutoSaveStatus((resource, status, error) => {
    currentStatuses.set(resource, status);
    if (status === 'error' && error) {
      errorMessages.set(resource, error);
    } else if (status !== 'error') {
      errorMessages.delete(resource);
    }
    // Nur die Buttons aktualisieren, die diese Ressource betreffen
    for (const { buttonId, resources } of BUTTON_RESOURCE_MAP) {
      if (resources.includes(resource as TResourceKey)) {
        updateBadge(buttonId, resources);
      }
    }
  });

  // Online/Offline-Events: alle Badges neu rendern
  onlineOfflineHandler = () => {
    for (const { buttonId, resources } of BUTTON_RESOURCE_MAP) {
      updateBadge(buttonId, resources);
    }
  };
  window.addEventListener('online', onlineOfflineHandler);
  window.addEventListener('offline', onlineOfflineHandler);
}

/**
 * Entfernt alle Badges (z. B. bei logoutUser).
 */
export function destroyAutoSaveIndicator(): void {
  // Listener abmelden
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // Online/Offline-Listener entfernen
  if (onlineOfflineHandler) {
    window.removeEventListener('online', onlineOfflineHandler);
    window.removeEventListener('offline', onlineOfflineHandler);
    onlineOfflineHandler = null;
  }

  // Alle Badge-Elemente entfernen
  for (const [buttonId, badge] of badgeElements) {
    badge.remove();
    // position-relative ggf. entfernen
    const btn = document.getElementById(buttonId);
    btn?.classList.remove('position-relative');
  }
  badgeElements.clear();

  // Fade-Timer aufräumen
  for (const timer of fadeTimers.values()) clearTimeout(timer);
  fadeTimers.clear();

  // Status zurücksetzen
  currentStatuses = new Map();
  errorMessages.clear();
}
