export const ACT_AS_STATUS_EVENT = 'db-nebengeld:act-as-status-change';

export type ActAsState = {
  active: boolean;
  userId: string | null;
  userName: string | null;
  currentUserName: string | null;
};

/**
 * Vereinheitlicht einen Benutzernamen für den Vergleich (getrimmt, kleingeschrieben).
 *
 * @param value - Benutzername.
 * @returns Normalisierter Name; leerer String bei `null`/`undefined`.
 */
function normalizeUserName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Liest einen `localStorage`-Wert direkt (ohne `Storage`) und entpackt JSON-Strings.
 *
 * @param key - `localStorage`-Key.
 * @returns Der Wert; bei nicht parsbarem Inhalt der Rohwert, ohne Eintrag `null`.
 */
function readStoredValue(key: string): string | null {
  const rawValue = localStorage.getItem(key);
  if (rawValue === null) return null;

  try {
    return JSON.parse(rawValue) as string;
  } catch {
    return rawValue;
  }
}

/**
 * Ermittelt, ob gerade die Daten eines anderen Benutzers angezeigt werden: angemeldet (Access-
 * oder Refresh-Token), Act-As-Id gesetzt und Act-As-Name verschieden vom angemeldeten Benutzer.
 *
 * @returns Aktueller Act-As-Zustand samt Namen.
 */
export function getActAsState(): ActAsState {
  const userId = readStoredValue('actAsUserId');
  const userName = readStoredValue('actAsUserName');
  const currentUserName = readStoredValue('Benutzer');
  const hasSessionToken = Boolean(readStoredValue('AccessToken') || readStoredValue('RefreshToken'));

  const active =
    hasSessionToken && Boolean(userId) && normalizeUserName(userName) !== normalizeUserName(currentUserName);

  return {
    active,
    userId,
    userName,
    currentUserName,
  };
}

/**
 * Meldet den aktuellen Act-As-Zustand per `ACT_AS_STATUS_EVENT` an `window`.
 *
 * @returns Der gemeldete Zustand.
 */
export function notifyActAsStateChanged(): ActAsState {
  const state = getActAsState();
  window.dispatchEvent(new CustomEvent<ActAsState>(ACT_AS_STATUS_EVENT, { detail: state }));
  return state;
}

/**
 * Zeigt oder versteckt den Hinweis-Banner (`#actAsNotice`) passend zum Act-As-Zustand. Ohne die
 * Banner-Elemente im DOM wird nur der Zustand geliefert.
 *
 * @returns Aktueller Act-As-Zustand.
 */
export function updateActAsBanner(): ActAsState {
  const state = getActAsState();
  const noticeEl = document.querySelector<HTMLElement>('#actAsNotice');
  const textEl = document.querySelector<HTMLElement>('#actAsNoticeText');
  const buttonEl = document.querySelector<HTMLButtonElement>('#actAsOwnDataButton');

  if (!noticeEl || !textEl) return state;

  if (!state.active) {
    noticeEl.classList.add('d-none');
    textEl.textContent = '';
    if (buttonEl) buttonEl.textContent = 'Eigene Daten laden';
    return state;
  }

  const viewedUser = state.userName?.trim() || 'einem anderen Benutzer';
  const currentUser = state.currentUserName?.trim();
  const suffix = currentUser ? ` Angemeldet bist du weiterhin als ${currentUser}.` : '';

  textEl.textContent = `Du siehst gerade die Daten von ${viewedUser}.${suffix}`;
  if (buttonEl) buttonEl.textContent = 'Eigene Daten laden';
  noticeEl.classList.remove('d-none');

  return state;
}
