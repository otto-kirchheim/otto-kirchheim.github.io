import { abortController } from './abortController';
import tokenErneuern from './token/tokenErneuern';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import Storage from '../lib/storage/Storage';
import dayjs from 'dayjs';
import compareVersion from '../lib/version/compareVersion';
import { invokeHook } from '@/shared/lib/feature';

let versionOutdated = false;

interface ServerConfig {
  url: string;
  timeout: number;
}

export const API_URL: ServerConfig[] = import.meta.env.PROD
  ? [
      { url: 'https://lst.otto.home64.de/api/v2', timeout: 3000 },
      { url: 'https://web-app-rn6h2lgzma-ey.a.run.app/api/v2', timeout: 8000 },
    ]
  : [
      { url: 'https://api-dev.otto.home64.de/api/v2', timeout: 3000 },
      { url: 'http://localhost:8081/api/v2', timeout: 2000 },
      { url: 'http://192.168.178.56:8081/api/v2', timeout: 2000 },
    ];

let serverCheckCounter = 0;
let serverProbePromise: Promise<string> | null = null;
let serverStatusSnackBar: ReturnType<typeof createSnackBar> | null = null;
let offlineSnackBarShown = false;
const singleFlightRequests = new Map<string, Promise<unknown>>();
let refreshFlightPromise: Promise<void> | null = null;

const PUBLIC_AUTH_PATHS = [
  'auth/login',
  'auth/register',
  'auth/refresh-token',
  'auth/forgot-password',
  'auth/passkeys/login/options',
  'auth/passkeys/login/verify',
  'auth/verify-email',
] as const;

const SINGLE_FLIGHT_AUTH_ROUTES = [
  'auth/login',
  'auth/register',
  'auth/refresh-token',
  'auth/forgot-password',
  'auth/resend-verification-email',
  'auth/verify-email',
  'auth/passkeys/login/options',
  'auth/passkeys/login/verify',
] as const;

const PROACTIVE_REFRESH_LEEWAY_MS = 30_000;

type FetchRetryEnvelope<T> = {
  data: T;
  success: boolean;
  statusCode: number;
  message?: string;
};

type FetchRetryResponse<T> = FetchRetryEnvelope<T> | Error;

/**
 * Liest die Id des Benutzers, als der ein Admin handelt (`actAsUserId` im localStorage).
 *
 * @returns Getrimmte Id oder `null`, wenn keine gesetzt ist.
 */
function getActAsUserIdFromStorage(): string | null {
  const raw = localStorage.getItem('actAsUserId');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null;
  } catch {
    return raw.trim() || null;
  }
}

/**
 * Entfernt führende Slashes und wandelt in Kleinbuchstaben, damit Pfadvergleiche stabil sind.
 *
 * @param urlPath - API-Pfad.
 * @returns Normalisierter Pfad.
 */
function normalizeUrlPath(urlPath: string): string {
  return urlPath.replace(/^\/+/, '').toLowerCase();
}

/**
 * Prüft, ob `x-act-as-user-id` mitgesendet wird: nur für Daten-Pfade (Profil, Ressourcen, Vorgaben, `savedata`, Jahres-Pfad `YYYY`).
 *
 * @param urlPath - API-Pfad.
 * @returns `true`, wenn der Header gesetzt werden soll.
 */
function shouldAttachActAsHeader(urlPath: string): boolean {
  const normalizedPath = normalizeUrlPath(urlPath);

  const actAsPaths = [
    'user-profiles/me',
    'bereitschaftszeitraum',
    'bereitschaftseinsatz',
    'einsatzwechseltaetigkeit',
    'nebengeld',
    'vorgaben',
    'savedata',
  ];

  if (/^\d{4}$/.test(normalizedPath)) return true;

  return actAsPaths.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

/**
 * Prüft, ob eine 401-Antwort einen Token-Refresh mit erneutem Versuch auslöst: nur mit vorhandenem Refresh-Token und nicht bei öffentlichen Auth-Pfaden oder `auth/reset-password/`.
 *
 * @param urlPath - API-Pfad.
 * @param status - HTTP-Status der Antwort.
 * @returns `true`, wenn erneuert und wiederholt werden soll.
 */
function shouldRetryWithRefresh(urlPath: string, status: number): boolean {
  if (status !== 401 || !Storage.check('RefreshToken')) return false;

  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath.startsWith('auth/reset-password/')) return false;

  return !isPublicAuthPath(normalizedPath);
}

/**
 * Prüft, ob der Bearer-Header gesendet wird: nicht bei öffentlichen Auth-Pfaden und `auth/reset-password/`.
 *
 * @param urlPath - API-Pfad.
 * @returns `true`, wenn der Header gesetzt werden soll.
 */
function shouldAttachAuthorizationHeader(urlPath: string): boolean {
  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath.startsWith('auth/reset-password/')) return false;

  return !isPublicAuthPath(normalizedPath);
}

/**
 * Prüft, ob der Pfad ein öffentlicher Auth-Pfad ist (ohne Anmeldung erreichbar).
 *
 * @param normalizedPath - Bereits mit `normalizeUrlPath` normalisierter Pfad.
 * @returns `true` bei Treffer oder Unterpfad eines Eintrags aus `PUBLIC_AUTH_PATHS`.
 */
function isPublicAuthPath(normalizedPath: string): boolean {
  return PUBLIC_AUTH_PATHS.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

/**
 * Prüft, ob identische gleichzeitige Aufrufe zu einem Request zusammengefasst werden: Auth-POSTs aus `SINGLE_FLIGHT_AUTH_ROUTES` und `GET auth/verify-email`.
 *
 * @param urlPath - API-Pfad.
 * @param method - HTTP-Methode.
 * @returns `true`, wenn Single-Flight gilt.
 */
function shouldUseSingleFlight(urlPath: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): boolean {
  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath === 'auth/verify-email' || normalizedPath.startsWith('auth/verify-email/')) {
    return method === 'GET';
  }

  if (method !== 'POST') return false;

  return SINGLE_FLIGHT_AUTH_ROUTES.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

/**
 * Bildet den Schlüssel, unter dem gleiche Aufrufe erkannt werden (Methode, Pfad und Body).
 *
 * @typeParam I - Typ des Request-Bodys.
 * @param urlPath - API-Pfad.
 * @param method - HTTP-Methode.
 * @param data - Request-Body.
 * @returns Schlüssel für `singleFlightRequests`.
 */
function buildSingleFlightKey<I>(
  urlPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: I,
): string {
  return `${method}:${normalizeUrlPath(urlPath)}:${JSON.stringify(data ?? null)}`;
}

/**
 * Liest den Ablaufzeitpunkt (`exp`) aus dem Payload eines JWT, ohne die Signatur zu prüfen.
 *
 * @param token - JWT.
 * @returns Ablauf in Millisekunden seit Epoche oder `null`, wenn er sich nicht lesen lässt.
 */
function readJwtExpMillis(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Prüft, ob das Access-Token vor dem Request erneuert wird, weil es innerhalb von `PROACTIVE_REFRESH_LEEWAY_MS` abläuft. Nicht bei öffentlichen Auth-Pfaden, `auth/reset-password/` oder ohne Refresh-Token.
 *
 * @param urlPath - API-Pfad.
 * @param accessToken - Aktuelles Access-Token.
 * @returns `true`, wenn vorab erneuert werden soll.
 */
function shouldRefreshBeforeRequest(urlPath: string, accessToken: string | null): boolean {
  if (!accessToken || !Storage.check('RefreshToken')) return false;

  const normalizedPath = normalizeUrlPath(urlPath);
  if (normalizedPath.startsWith('auth/reset-password/')) return false;
  if (isPublicAuthPath(normalizedPath)) return false;

  const expMillis = readJwtExpMillis(accessToken);
  if (expMillis === null) return false;

  return expMillis - Date.now() <= PROACTIVE_REFRESH_LEEWAY_MS;
}

/**
 * Erneuert das Access-Token; gleichzeitige Aufrufe teilen sich einen laufenden Refresh.
 *
 * @param retry - Nummer des Wiederholungsversuchs, wird an `tokenErneuern` weitergegeben.
 */
async function refreshAccessTokenSingleFlight(retry: number): Promise<void> {
  if (refreshFlightPromise) return refreshFlightPromise;

  refreshFlightPromise = tokenErneuern(retry).finally(() => {
    refreshFlightPromise = null;
  });

  return refreshFlightPromise;
}

/**
 * Verwirft die gemerkte Server-URL samt letztem Kontakt, sodass `getServerUrl` neu sucht.
 */
function invalidateServerCache(): void {
  sessionStorage.removeItem('lastServerContact');
  sessionStorage.removeItem('currentServerUrl');
}

/**
 * Prüft per `GET <serverUrl>/`, ob der Server antwortet, und wertet dabei `min_frontend_version` der Antwort aus (ist die App zu alt, feuert der Hook `app:version-outdated` einmalig).
 *
 * @param serverUrl - Basis-URL des zu prüfenden Servers.
 * @param timeout - Abbruchzeit in Millisekunden.
 * @returns `true`, wenn der Server geantwortet hat (auch mit Fehlerstatus), sonst `false` bei Timeout oder Netzfehler.
 */
async function checkServerConnection(serverUrl: string, timeout: number): Promise<boolean> {
  const controller = new AbortController();
  const timerLabel = `Serververbindung herstellen #${++serverCheckCounter} (${serverUrl})`;
  const timeoutId = setTimeout(() => {
    console.log(`Server check for ${serverUrl} timed out after ${timeout}ms.`);
    controller.abort('Timeout');
  }, timeout);

  try {
    console.time(timerLabel);
    const response = await fetch(`${serverUrl}/`, { method: 'GET', signal: controller.signal });
    sessionStorage.setItem('lastServerContact', Date.now().toString());
    try {
      const json = (await response.json()) as Record<string, unknown>;
      const minVersion = json?.min_frontend_version;
      if (
        !versionOutdated &&
        typeof minVersion === 'string' &&
        compareVersion(import.meta.env.APP_VERSION, minVersion) < 0
      ) {
        versionOutdated = true;
        invokeHook('app:version-outdated');
      }
    } catch {
      // Keine JSON-Antwort: Versionsprüfung entfällt.
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      console.error(`Fetch aborted for ${serverUrl}:`, error.message);
    return false;
  } finally {
    clearTimeout(timeoutId);
    console.timeEnd(timerLabel);
  }
}

/**
 * Liefert die Basis-URL des erreichbaren Servers. Innerhalb von 5 Minuten nach dem letzten Kontakt gilt die gemerkte URL, sonst werden die Server aus `API_URL` der Reihe nach geprüft; dabei zeigt eine Snackbar den Verbindungsaufbau.
 *
 * @returns URL des ersten erreichbaren Servers.
 * @throws {Error} Wenn kein Server erreichbar ist.
 */
export async function getServerUrl(): Promise<string> {
  const lastServerContact = sessionStorage.getItem('lastServerContact');
  const serverConfigs: ServerConfig[] = API_URL.map(config => ({
    ...config,
    timeout: config.timeout || 5000, // Default timeout if not provided
  }));
  const currentServerUrl = sessionStorage.getItem('currentServerUrl');
  const defaultServerUrl = serverConfigs[0].url;

  if (lastServerContact && +lastServerContact - Date.now() + 5 * 60 * 1000 >= 0) {
    return currentServerUrl ?? defaultServerUrl;
  }

  // Gleichzeitige API-Aufrufe (Start, Offline-Phase) teilen sich eine laufende Serversuche.
  if (serverProbePromise) return serverProbePromise;

  serverProbePromise = (async () => {
    if (!serverStatusSnackBar)
      serverStatusSnackBar = createSnackBar({
        message: 'Serververbindung wird aufgebaut. Bitte warten.',
        dismissible: false,
        status: 'info',
        timeout: false,
        fixed: true,
      });

    for (const config of serverConfigs) {
      if (await checkServerConnection(config.url, config.timeout)) {
        sessionStorage.setItem('currentServerUrl', config.url);
        sessionStorage.setItem('lastServerContact', Date.now().toString());
        offlineSnackBarShown = false;
        if (serverStatusSnackBar) {
          serverStatusSnackBar.Close();
          serverStatusSnackBar = null;
        }
        return config.url;
      }
    }

    if (serverStatusSnackBar) {
      serverStatusSnackBar.Close();
      serverStatusSnackBar = null;
    }

    if (!offlineSnackBarShown) {
      createSnackBar({
        message: 'Server nicht Erreichbar',
        dismissible: true,
        icon: 'warn',
        status: 'warning',
        timeout: 3000,
        fixed: true,
      });
      offlineSnackBarShown = true;
    }

    throw new Error('Server nicht Erreichbar');
  })().finally(() => {
    serverProbePromise = null;
  });

  return serverProbePromise;
}

/**
 * Ruft die API auf: setzt Bearer-, Act-As- und Client-Version-Header, erneuert das Access-Token vorab oder nach 401 und wiederholt den Request. Identische öffentliche Auth-Aufrufe werden zusammengefasst (Single-Flight).
 *
 * @typeParam I - Typ des Request-Bodys.
 * @typeParam T - Typ der Antwortdaten.
 * @param UrlPath - Pfad relativ zur Server-URL.
 * @param data - Optionaler JSON-Body.
 * @param method - HTTP-Methode; Standard `GET`.
 * @param retry - Anzahl bisheriger Token-Refresh-Wiederholungen; nur der rekursive Aufruf setzt sie größer als 0.
 * @returns Antwort-Envelope mit `data`, `success`, `statusCode` und `message`.
 * @throws {Error} Bei veralteter App-Version, fehlender Verbindung, zu vielen Token-Fehlern oder Fetch-Fehlern.
 */
export async function FetchRetry<I, T>(
  UrlPath: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  retry = 0,
): Promise<FetchRetryResponse<T>> {
  if (versionOutdated) throw new Error('Version veraltet – bitte App aktualisieren');

  const useSingleFlight = retry === 0 && shouldUseSingleFlight(UrlPath, method);

  if (useSingleFlight) {
    const requestKey = buildSingleFlightKey(UrlPath, method, data);
    const existingRequest = singleFlightRequests.get(requestKey);
    if (existingRequest) return existingRequest as Promise<FetchRetryResponse<T>>;

    const requestPromise = executeFetchRetry<I, T>(UrlPath, data, method, retry).finally(() => {
      singleFlightRequests.delete(requestKey);
    });

    singleFlightRequests.set(requestKey, requestPromise as Promise<unknown>);
    return requestPromise;
  }

  return executeFetchRetry<I, T>(UrlPath, data, method, retry);
}

/**
 * Führt einen einzelnen Request aus (ohne Single-Flight): Vorab-Refresh, Header, Serversuche, bei 401 Refresh und Wiederholung. Ist der Server nicht erreichbar, wird der Request bis zu dreimal wiederholt; vor der letzten Wiederholung wird der Server-Cache verworfen.
 *
 * @typeParam I - Typ des Request-Bodys.
 * @typeParam T - Typ der Antwortdaten.
 * @param UrlPath - Pfad relativ zur Server-URL.
 * @param data - Optionaler JSON-Body.
 * @param method - HTTP-Methode; Standard `GET`.
 * @param retry - Anzahl bisheriger Token-Refresh-Wiederholungen; mehr als 2 bricht ab.
 * @param serverRetry - Anzahl bisheriger Wiederholungen wegen nicht erreichbarem Server.
 * @returns Antwort-Envelope mit `data`, `success`, `statusCode` und `message`.
 * @throws {Error} Ohne Internetverbindung, bei zu vielen Token-Fehlern oder Fetch-Fehlern.
 */
async function executeFetchRetry<I, T>(
  UrlPath: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  retry = 0,
  serverRetry = 0,
): Promise<FetchRetryResponse<T>> {
  if (!navigator.onLine) throw new Error('Keine Internetverbindung');
  if (retry > 2) throw new Error('Zu viele Tokenfehler');

  let accessToken = Storage.get<string>('AccessToken', { default: undefined });
  if (shouldRefreshBeforeRequest(UrlPath, accessToken)) {
    await refreshAccessTokenSingleFlight(retry);
    accessToken = Storage.get<string>('AccessToken', { default: undefined });
  }

  const headers = new Headers();
  if (method !== 'GET') headers.set('Content-Type', 'application/json');

  if (accessToken && shouldAttachAuthorizationHeader(UrlPath)) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const actAsUserId = getActAsUserIdFromStorage();
  if (actAsUserId && shouldAttachActAsHeader(UrlPath)) headers.set('x-act-as-user-id', actAsUserId);

  headers.set('x-client-version', import.meta.env.APP_VERSION);

  const fetchObject: RequestInit = {
    mode: 'cors',
    headers,
    method,
    signal: abortController.signal,
    cache: 'no-cache',
  };
  if (data) fetchObject.body = JSON.stringify(data);

  let serverUrl: string | undefined;
  let serverReachable = false;
  try {
    serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/${UrlPath}`, fetchObject);
    serverReachable = true;
    const responseBody = (await response.json()) as
      ({ data?: T; success?: boolean; message?: string } & Record<string, unknown>) | null;
    if (response.status === 426 && !versionOutdated) {
      versionOutdated = true;
      invokeHook('app:version-outdated');
    }

    if (shouldRetryWithRefresh(UrlPath, response.status)) {
      await refreshAccessTokenSingleFlight(retry);
      return await FetchRetry(UrlPath, data, method, retry + 1);
    }

    sessionStorage.setItem('lastServerContact', dayjs().valueOf().toString());

    const responded: FetchRetryEnvelope<T> = {
      data: responseBody?.data as T,
      success: responseBody?.success ?? response.ok,
      statusCode: response.status,
      message: responseBody?.message,
    };

    return responded;
  } catch (error: unknown) {
    if (!serverReachable && serverRetry < 3) {
      if (serverRetry === 2) invalidateServerCache();
      return executeFetchRetry(UrlPath, data, method, retry, serverRetry + 1);
    }
    console.error('Fetch error occurred:', error);
    throw new Error(
      `Fetch-Fehler: ${(<Error>error).message || error}. URL: ${serverUrl ? `${serverUrl}/${UrlPath}` : UrlPath}, Method: ${method}, Retry: ${retry}`,
      { cause: error },
    );
  }
}
