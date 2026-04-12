import { abortController, tokenErneuern } from '.';
import { createSnackBar } from '../class/CustomSnackbar';
import Storage from './Storage';

interface ServerConfig {
  url: string;
  timeout: number;
}

let serverCheckCounter = 0;
let serverProbePromise: Promise<string> | null = null;
let serverStatusSnackBar: ReturnType<typeof createSnackBar> | null = null;
let offlineSnackBarShown = false;

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
  const publicAuthPaths = [
    'auth/login',
    'auth/register',
    'auth/refresh-token',
    'auth/logout',
    'auth/forgot-password',
    'auth/resend-verification-email',
    'auth/passkeys/login/options',
    'auth/passkeys/login/verify',
    'auth/verify-email',
  ];

  if (normalizedPath.startsWith('auth/reset-password/')) return false;

  return !publicAuthPaths.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
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
): Promise<{ data: T; status: boolean; statusCode: number; message: string } | Error> {
  if (!navigator.onLine) throw new Error('Keine Internetverbindung');
  if (retry > 2) throw new Error('Zu viele Tokenfehler');

  const serverUrl = await getServerUrl();

  const headers = new Headers();
  if (method !== 'GET') headers.set('Content-Type', 'application/json');

  const accessToken = Storage.check('AccessToken') ? Storage.get<string>('AccessToken', true) : null;
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

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
    const responded = await response.json();
    if (shouldRetryWithRefresh(UrlPath, response.status)) {
      await tokenErneuern(retry);
      return await FetchRetry(UrlPath, data, method, retry + 1);
    }
    responded.statusCode = response.status;
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
