import { abortController } from './abortController';
import tokenErneuern from '../tokenManagement/tokenErneuern';
import { createSnackBar } from '../../class/CustomSnackbar';
import Storage from '../storage/Storage';

interface ServerConfig {
  url: string;
  timeout: number;
}

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

function normalizeUrlPath(urlPath: string): string {
  return urlPath.replace(/^\/+/, '').toLowerCase();
}

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

function shouldRetryWithRefresh(urlPath: string, status: number): boolean {
  if (status !== 401 || !Storage.check('RefreshToken')) return false;

  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath.startsWith('auth/reset-password/')) return false;

  return !isPublicAuthPath(normalizedPath);
}

function shouldAttachAuthorizationHeader(urlPath: string): boolean {
  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath.startsWith('auth/reset-password/')) return false;

  return !isPublicAuthPath(normalizedPath);
}

function isPublicAuthPath(normalizedPath: string): boolean {
  return PUBLIC_AUTH_PATHS.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

function shouldUseSingleFlight(urlPath: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): boolean {
  const normalizedPath = normalizeUrlPath(urlPath);

  if (normalizedPath === 'auth/verify-email' || normalizedPath.startsWith('auth/verify-email/')) {
    return method === 'GET';
  }

  if (method !== 'POST') return false;

  return SINGLE_FLIGHT_AUTH_ROUTES.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

function buildSingleFlightKey<I>(
  urlPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: I,
): string {
  return `${method}:${normalizeUrlPath(urlPath)}:${JSON.stringify(data ?? null)}`;
}

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

function shouldRefreshBeforeRequest(urlPath: string, accessToken: string | null): boolean {
  if (!accessToken || !Storage.check('RefreshToken')) return false;

  const normalizedPath = normalizeUrlPath(urlPath);
  if (normalizedPath.startsWith('auth/reset-password/')) return false;
  if (isPublicAuthPath(normalizedPath)) return false;

  const expMillis = readJwtExpMillis(accessToken);
  if (expMillis === null) return false;

  return expMillis - Date.now() <= PROACTIVE_REFRESH_LEEWAY_MS;
}

async function refreshAccessTokenSingleFlight(retry: number): Promise<void> {
  if (refreshFlightPromise) return refreshFlightPromise;

  refreshFlightPromise = tokenErneuern(retry).finally(() => {
    refreshFlightPromise = null;
  });

  return refreshFlightPromise;
}
/**
 * Checks the server connection with a configurable timeout.
 * @param serverUrl - The URL of the server to check.
 * @param timeout - The timeout duration in milliseconds.
 * @returns A promise that resolves to a boolean indicating the server's availability.
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
    await fetch(`${serverUrl}/`, { method: 'GET', signal: controller.signal });
    sessionStorage.setItem('lastServerContact', Date.now().toString());
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

  // Reuse one active probe for concurrent API calls during startup/offline phases.
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

export async function FetchRetry<I, T>(
  UrlPath: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  retry = 0,
): Promise<FetchRetryResponse<T>> {
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

async function executeFetchRetry<I, T>(
  UrlPath: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  retry = 0,
): Promise<FetchRetryResponse<T>> {
  if (!navigator.onLine) throw new Error('Keine Internetverbindung');
  if (retry > 2) throw new Error('Zu viele Tokenfehler');

  let accessToken = Storage.get<string>('AccessToken', { default: undefined });
  if (shouldRefreshBeforeRequest(UrlPath, accessToken)) {
    await refreshAccessTokenSingleFlight(retry);
    accessToken = Storage.get<string>('AccessToken', { default: undefined });
  }

  const serverUrl = await getServerUrl();

  const headers = new Headers();
  if (method !== 'GET') headers.set('Content-Type', 'application/json');

  if (accessToken && shouldAttachAuthorizationHeader(UrlPath)) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const actAsUserId = getActAsUserIdFromStorage();
  if (actAsUserId && shouldAttachActAsHeader(UrlPath)) headers.set('x-act-as-user-id', actAsUserId);

  const fetchObject: RequestInit = {
    mode: 'cors',
    headers,
    method,
    signal: abortController.signal,
    cache: 'no-cache',
  };
  if (data) fetchObject.body = JSON.stringify(data);
  try {
    const response = await fetch(`${serverUrl}/${UrlPath}`, fetchObject);
    const responseBody = (await response.json()) as
      | ({ data?: T; success?: boolean; message?: string } & Record<string, unknown>)
      | null;
    if (shouldRetryWithRefresh(UrlPath, response.status)) {
      await refreshAccessTokenSingleFlight(retry);
      return await FetchRetry(UrlPath, data, method, retry + 1);
    }

    const responded: FetchRetryEnvelope<T> = {
      data: responseBody?.data as T,
      success: responseBody?.success ?? response.ok,
      statusCode: response.status,
      message: responseBody?.message,
    };

    return responded;
  } catch (error: unknown) {
    console.error('Fetch error occurred:', error);
    throw new Error(
      `Fetch-Fehler: ${(<Error>error).message || error}. URL: ${serverUrl}/${UrlPath}, Method: ${method}, Retry: ${retry}`,
      { cause: error },
    );
  }
}

export const API_URL: ServerConfig[] = import.meta.env.PROD
  ? [
      { url: 'https://lst.otto.home64.de/api/v2', timeout: 3000 },
      { url: 'https://web-app-rn6h2lgzma-ey.a.run.app/api/v2', timeout: 8000 },
    ]
  : [
      { url: 'http://192.168.178.56:8081/api/v2', timeout: 3000 },
      { url: 'http://localhost:8081/api/v2', timeout: 2000 },
      { url: 'http://127.0.0.1:8081/api/v2', timeout: 2000 },
    ];
