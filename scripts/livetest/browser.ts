/**
 * Browser-Umgebung der Browser-Skripte (`livetest.ts`, `sichtvergleich.ts`): Start mit Request-Interception und
 * Startzustand, Login mit Wechsel in den Testmonat, kleine Helfer.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { API_BASES, JAHR, MONAT, type Backend } from './backends';

/** Zeilen einer Tabelle im aktuellen Monatsfilter (`CustomTable.rows.getFilteredRows`). */
export async function sichtbareZeilen(page: Page, tableId: string): Promise<number | null> {
  return page.evaluate(id => {
    const table = document.querySelector(`#${id}`) as unknown as {
      instance?: { rows: { getFilteredRows(): unknown[] } };
    } | null;
    return table?.instance ? table.instance.rows.getFilteredRows().length : null;
  }, tableId);
}

/** Wert eines Storage-Keys (Ressourcen sind als `{ data, timestamp }` gespeichert). */
export async function storage<T>(page: Page, key: string): Promise<T | null> {
  return page.evaluate(k => {
    const raw = localStorage.getItem(k);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as { data?: unknown };
    return (parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed) as never;
  }, key) as Promise<T | null>;
}

/** Wartet, bis `fn` im Browser wahr ist; `false` nach Ablauf von `timeout`. */
export async function warteBis(page: Page, fn: (arg: string) => boolean, arg = '', timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(fn, { timeout, polling: 100 }, arg);
    return true;
  } catch {
    return false;
  }
}

/** Optionen fuer `oeffneApp`. */
export interface AppOptionen {
  backend: Backend;
  /** URL des echten Backends; ohne Angabe beantwortet `backend` alle API-Aufrufe. */
  backendUrl?: string;
  chrome: string;
  headful?: boolean;
  slow?: number;
  /** Viewport, Standard 1400 x 900. */
  viewport?: { width: number; height: number };
  /** Farbschema des Browsers (`prefers-color-scheme`). */
  farbschema?: 'light' | 'dark';
}

/** Geoeffnete App: Browser, Seite und Mitschnitte. */
export interface App {
  browser: Browser;
  page: Page;
  /** API-Aufrufe der App an das gewaehlte Backend (`METHODE pfad`). */
  apiLog: string[];
  seitenfehler: string[];
  konsolenfehler: string[];
}

/**
 * Startet den Browser, leitet die API-Aufrufe an `backend` und setzt den Startzustand (leerer Storage, Testmonat,
 * Ersteinrichtung erledigt). Die Seite selbst laedt der Aufrufer (`page.goto`).
 *
 * @param optionen - Backend, Browser und Darstellung.
 * @returns Browser, Seite und Mitschnitte.
 */
export async function oeffneApp(optionen: AppOptionen): Promise<App> {
  const { backend, backendUrl } = optionen;
  const apiBasen = backendUrl && !API_BASES.includes(backendUrl) ? [...API_BASES, backendUrl] : API_BASES;
  const browser = await puppeteer.launch({
    executablePath: optionen.chrome,
    headless: !optionen.headful,
    slowMo: optionen.slow ?? 0,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security'],
  });
  const page = await browser.newPage();
  await page.setViewport(optionen.viewport ?? { width: 1400, height: 900 });
  if (optionen.farbschema)
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: optionen.farbschema }]);

  const app: App = { browser, page, apiLog: [], seitenfehler: [], konsolenfehler: [] };
  page.on('pageerror', error => app.seitenfehler.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') app.konsolenfehler.push(message.text());
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    const apiBase = apiBasen.find(candidate => url.startsWith(candidate));
    if (!apiBase) {
      void request.continue();
      return;
    }
    if (request.method() !== 'OPTIONS' && (!backendUrl || apiBase === backendUrl))
      app.apiLog.push(
        `${request.method()} ${new URL(url).pathname.replace(new URL(apiBase).pathname, '').replace(/^\//, '')}`,
      );
    void backend.abfangen(request, apiBase).then(erledigt => (erledigt ? undefined : request.continue()));
  });

  // Frischer Zustand, fester Monat, Ersteinrichtung als erledigt markiert.
  await page.evaluateOnNewDocument(
    (monat: number, jahr: number) => {
      if (sessionStorage.getItem('livetest-init')) return;
      sessionStorage.setItem('livetest-init', '1');
      localStorage.clear();
      localStorage.setItem('Monat', JSON.stringify(monat));
      localStorage.setItem('Jahr', JSON.stringify(jahr));
      localStorage.setItem('OnboardingAbgeschlossen', JSON.stringify(true));
    },
    MONAT,
    JAHR,
  );
  return app;
}

/**
 * Meldet sich ueber das Login-Formular an, wartet auf die geladenen Tabellen und wechselt in den Testmonat (`MONAT`):
 * der Login setzt `#Monat` auf den heutigen Monat.
 *
 * @param page - Seite mit geladener App.
 * @param user - Benutzername.
 * @param password - Passwort.
 * @returns `formular`: Login-Formular gefunden, `geladen`: Tabellen gemountet und Daten im Storage.
 */
export async function anmelden(
  page: Page,
  user: string,
  password: string,
): Promise<{ formular: boolean; geladen: boolean }> {
  // Sichtbar, nicht nur vorhanden: ein eben geschlossener Login-Dialog haengt kurz noch im DOM.
  const sichtbar = (timeout: number) => page.waitForSelector('#Benutzer', { visible: true, timeout }).catch(() => null);
  let loginFeld = await sichtbar(500);
  if (!loginFeld) {
    await page.evaluate(() => (document.querySelector('#btnLogin') as HTMLElement | null)?.click());
    loginFeld = await sichtbar(5000);
  }
  if (!loginFeld) return { formular: false, geladen: false };
  await page.type('#Benutzer', user);
  await page.type('#Passwort', password);
  await page.evaluate(() => (document.querySelector('#btnLoginModal') as HTMLElement | null)?.click());

  const geladen = await warteBis(
    page,
    () => {
      const t = document.querySelector('#tableEA') as unknown as { instance?: unknown } | null;
      return Boolean(t?.instance) && localStorage.getItem('dataEA') !== null;
    },
    '',
    20000,
  );
  // `page.select` loest das `change` so aus, dass auch Reacts Wert-Tracker es sieht (ein blankes `value =` nicht).
  if (await page.$('#Monat')) await page.select('#Monat', String(MONAT));
  await warteBis(page, m => localStorage.getItem('Monat') === m, String(MONAT), 5000);
  return { formular: true, geladen };
}
