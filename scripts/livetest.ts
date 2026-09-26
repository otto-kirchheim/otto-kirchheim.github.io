/**
 * Live-Test im echten Browser (Puppeteer) gegen den laufenden Vite-Dev-Server.
 *
 * Zwei Modi:
 *  - Standard: Fake-Backend im Browser (Request-Interception), keine echten Daten, nichts wird persistiert.
 *  - `--backend <url>`: echtes Backend (z. B. das lokale `http://localhost:8081/api/v2`). Das Script meldet einen eigenen
 *    Testbenutzer an (legt ihn beim ersten Lauf per Zugangscode an), leert dessen Daten im Testjahr, legt die Testdaten
 *    ueber die API an und raeumt am Ende wieder auf. Andere Benutzer werden nicht angefasst.
 *
 * Prueft den Feature-Vertrag nach dem Umzug der Feature-Logik (Audit Schritt A):
 *  1. Login ueber das Login-Formular, Laden aller Ressourcen (`features/<id>/model/backend.ts`, `createResourceEndpoints`)
 *  2. Mapper, Monatsfilter je Tabelle (`features/<id>/model/monat.ts`), Berechnung aus der Registry (`loadUserDaten`)
 *  3. Ueberschneidungspruefung BZ/EWT (`meta.resources[].overlapWindow`)
 *  4. EWT loeschen + Speichern: `onDeleted` -> `ewt:deleted` -> Verweise in EZ und EA geloest
 *
 * Aufruf (Dev-Server muss laufen, z. B. `bun run dev`):
 *   bun scripts/livetest.ts                                        # Fake-Backend, headless
 *   bun scripts/livetest.ts --backend http://localhost:8081/api/v2  # lokales Backend
 *   bun scripts/livetest.ts --headful --slow 50                    # sichtbar mitverfolgen
 * Weitere Optionen: --base <Dev-Server-URL> (Standard http://localhost:8080), --chrome <Pfad>,
 *   --user/--password/--code (Testbenutzer im Backend-Modus, Standard livetest-fsd / Zugangscode kirchheim).
 */

import { tmpdir } from 'node:os';
import puppeteer, { type HTTPRequest, type Page } from 'puppeteer';
import { VorgabenGeldMock, VorgabenUMock } from '../test/mockData';
import packageJson from '../package.json';

// ─── Argumente ───────────────────────────────────────────

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const BASE = argValue('--base') ?? 'http://localhost:8080';
const BACKEND = argValue('--backend')?.replace(/\/$/, '');
const HEADFUL = args.includes('--headful');
const SLOW = Number(argValue('--slow') ?? 0);
const CHROME = argValue('--chrome') ?? '/usr/bin/google-chrome-stable';
const USER = argValue('--user') ?? 'livetest-fsd';
const PASSWORD = argValue('--password') ?? 'Livetest-FSD-2026!';
const ACCESS_CODE = argValue('--code') ?? 'kirchheim';

const JAHR = 2026;
const MONAT = 9;

/** Server-URLs aus `API_URL` (Dev, `FetchRetry.ts`); die App nimmt den ersten erreichbaren. */
const API_BASES = [
  'https://api-dev.otto.home64.de/api/v2',
  'http://localhost:8081/api/v2',
  'http://192.168.178.56:8081/api/v2',
];

/** API-Pfadsegmente der Feature-Ressourcen (`createResourceEndpoints` in `features/<id>/model/backend.ts`). */
const RESSOURCEN = ['bereitschaftszeitraum', 'bereitschaftseinsatz', 'einsatzwechseltaetigkeit', 'nebengeld', 'ea'];

// ─── Testdaten ───────────────────────────────────────────

type Doc = Record<string, unknown> & { _id: string };
type IdKey = 'bz1' | 'bz2' | 'be1' | 'e1' | 'e2' | 'e3' | 'n1' | 'ea1' | 'ea2';
type Ids = Record<IdKey, string>;

const iso = (date: string): string => new Date(date).toISOString();
const stamp = (): string => new Date().toISOString();

/**
 * Testdokumente im Backend-Format je Ressource (in Anlege-Reihenfolge); Verweise kommen aus `ids`.
 *
 * @param ids - Bereits vergebene `_id`s (BE -> BZ, EZ/EA -> EWT).
 * @returns Je Ressource Schluessel und Dokument.
 */
function testdokumente(ids: Partial<Ids>): Record<string, [IdKey, Record<string, unknown>][]> {
  const basis = { Monat: MONAT, Jahr: JAHR };
  const ewt = (tag: string) => ({
    ...basis,
    Tag: iso(`2026-09-${tag}T00:00:00Z`),
    Buchungstag: iso(`2026-09-${tag}T00:00:00Z`),
    Einsatzort: 'Licherode',
    Schicht: 'T',
    abWE: '06:40',
    ab1E: '07:20',
    anEE: '07:55',
    beginE: '07:00',
    endeE: '15:45',
    abEE: '14:50',
    an1E: '15:25',
    anWE: '16:05',
    berechnen: true,
  });
  const ea = (tag: string, ewtId?: string) => ({
    ...basis,
    EWT: ewtId,
    Tag: iso(`2026-09-${tag}T00:00:00Z`),
    Dauer: '04:00',
    Taetigkeit: 'Livetest',
    Entgeltgruppe: '105',
  });
  return {
    bereitschaftszeitraum: [
      ['bz1', { ...basis, Beginn: '2026-09-07T13:00:00.000Z', Ende: '2026-09-08T04:00:00.000Z', Pause: 0 }],
      ['bz2', { ...basis, Beginn: '2026-09-14T13:00:00.000Z', Ende: '2026-09-15T04:00:00.000Z', Pause: 0 }],
    ],
    bereitschaftseinsatz: [
      [
        'be1',
        {
          ...basis,
          Bereitschaftszeitraum: ids.bz1 ? [ids.bz1] : [],
          Tag: iso('2026-09-07T12:00:00Z'),
          Auftragsnummer: '123456789',
          Beginn: '20:00',
          Ende: '22:00',
          LRE: 'LRE 1',
          PrivatKm: 0,
        },
      ],
    ],
    einsatzwechseltaetigkeit: [
      ['e1', ewt('01')],
      ['e2', ewt('02')],
      ['e3', ewt('03')],
    ],
    nebengeld: [
      [
        'n1',
        {
          ...basis,
          EWT: ids.e1,
          Tag: iso('2026-09-01T00:00:00Z'),
          Beginn: '07:00',
          Ende: '15:45',
          Auftragsnummer: '123456789',
          Zulagen: [{ Typ: '040', Wert: 1 }],
        },
      ],
    ],
    ea: [
      ['ea1', ea('01', ids.e1)],
      ['ea2', ea('02', ids.e2)],
    ],
  };
}

// ─── Backends ────────────────────────────────────────────

interface Backend {
  name: string;
  /** Legt die Testdaten an und liefert deren `_id`s. */
  vorbereiten(): Promise<Ids>;
  /** Beantwortet oder steuert einen API-Request der App; `true`, wenn er damit erledigt ist. */
  abfangen(request: HTTPRequest, apiBase: string): Promise<boolean>;
  existiert(resource: string, id: string): Promise<boolean>;
  aufraeumen(): Promise<void>;
}

/**
 * Fake-Backend im Speicher, beantwortet die API-Aufrufe per Request-Interception.
 *
 * @returns Backend.
 */
function fakeBackend(): Backend {
  const db: Record<string, Doc[]> = {};
  const unbekannt = new Set<string>();
  const base64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwt = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
    userName: USER,
    role: 'member',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`;
  const profil = {
    _id: 'p1',
    User: USER,
    Pers: { ...VorgabenUMock.Pers, OE: [VorgabenUMock.Pers.OE] },
    Arbeitszeit: VorgabenUMock.Arbeitszeit,
    Fahrzeit: VorgabenUMock.Fahrzeit,
    VorgabenB: Object.entries(VorgabenUMock.VorgabenB).map(([key, value]) => ({ key, value })),
    Einstellungen: { ...VorgabenUMock.Einstellungen, aktivierteTabs: ['bereitschaft', 'ewt', 'neben', 'ea'] },
    updatedAt: stamp(),
  };
  const neu = (head: string, fields: Record<string, unknown>): Doc => {
    const { clientRequestId: _clientRequestId, ...rest } = fields;
    const doc = { ...rest, _id: `${head}-${crypto.randomUUID().slice(0, 8)}`, updatedAt: stamp() } as Doc;
    (db[head] ??= []).push(doc);
    return doc;
  };

  const antwort = (method: string, path: string, body: unknown): { status: number; data: unknown } => {
    const segs = path.split('/').filter(Boolean);
    const [head, second] = segs;
    if (segs.length === 0) return { status: 200, data: { min_frontend_version: '0.0.0' } };
    if (path === 'auth/login' || path === 'auth/refresh-token')
      return { status: 200, data: { user: { userName: USER, role: 'member' }, accessToken: jwt, refreshToken: 'rt' } };
    if (path === 'auth/me')
      return { status: 200, data: { userName: USER, role: 'member', email: 'live@test.de', emailVerified: true } };
    if (path === 'user-profiles/me') {
      if (method === 'PUT') Object.assign(profil, body as object, { updatedAt: stamp() });
      return { status: 200, data: profil };
    }
    if (head === 'vorgaben')
      return { status: 200, data: { _id: Number(second), Vorgaben: [{ key: 1, value: VorgabenGeldMock[1] }] } };

    if (RESSOURCEN.includes(head)) {
      const docs = (db[head] ??= []);
      if (method === 'GET' && /^\d{4}$/.test(second ?? '')) return { status: 200, data: docs };
      if (method === 'POST' && second === 'bulk') {
        const {
          create = [],
          update = [],
          delete: del = [],
        } = body as {
          create?: Record<string, unknown>[];
          update?: Doc[];
          delete?: string[];
        };
        const created = create.map(item => neu(head, item));
        const updated = update.map(item =>
          Object.assign(docs.find(doc => doc._id === item._id) ?? {}, item, { updatedAt: stamp() }),
        );
        for (const id of del)
          docs.splice(
            docs.findIndex(doc => doc._id === id),
            1,
          );
        const createdReferences = created.map((doc, i) => ({
          _id: doc._id,
          clientRequestId: create[i].clientRequestId,
        }));
        return { status: 200, data: { created, updated, deleted: del, createdReferences, errors: [] } };
      }
      if (method === 'POST' && !second) return { status: 201, data: neu(head, body as Record<string, unknown>) };
      const index = docs.findIndex(doc => doc._id === second);
      if (method === 'PUT' && index >= 0) {
        Object.assign(docs[index], body as object, { updatedAt: stamp() });
        return { status: 200, data: docs[index] };
      }
      if (method === 'DELETE' && index >= 0) {
        docs.splice(index, 1);
        return { status: 200, data: null };
      }
    }
    unbekannt.add(`${method} ${path}`);
    return { status: 200, data: method === 'GET' ? [] : {} };
  };

  return {
    name: 'Fake-Backend (Request-Interception)',
    async vorbereiten() {
      const ids = Object.fromEntries(
        Object.values(testdokumente({}))
          .flat()
          .map(([key]) => [key, key]),
      ) as Ids;
      for (const [resource, eintraege] of Object.entries(testdokumente(ids)))
        db[resource] = eintraege.map(([key, doc]) => ({ ...doc, _id: ids[key], updatedAt: stamp() }));
      return ids;
    },
    async abfangen(request, apiBase) {
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      };
      if (request.method() === 'OPTIONS') {
        await request.respond({ status: 204, headers });
        return true;
      }
      const path = new URL(request.url()).pathname.replace(new URL(apiBase).pathname, '').replace(/^\//, '');
      const raw = request.hasPostData() ? await request.fetchPostData() : undefined;
      const { status, data } = antwort(request.method(), path, raw ? JSON.parse(raw) : undefined);
      await request.respond({
        status,
        headers,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, statusCode: status, data }),
      });
      return true;
    },
    async existiert(resource, id) {
      return (db[resource] ?? []).some(doc => doc._id === id);
    },
    async aufraeumen() {
      if (unbekannt.size > 0) console.log(`\nVom Fake-Backend pauschal beantwortet:\n  ${[...unbekannt].join('\n  ')}`);
    },
  };
}

/**
 * Echtes Backend: eigener Testbenutzer, Testdaten ueber die API anlegen und am Ende wieder loeschen.
 *
 * @param url - API-Basis-URL, z. B. `http://localhost:8081/api/v2`.
 * @returns Backend.
 */
function echtesBackend(url: string): Backend {
  let token = '';
  const api = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${url}/${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-client-version': packageJson.version,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await response.json()) as { success: boolean; data: T; message?: string };
    if (!json.success) throw new Error(`${method} ${path}: ${response.status} ${json.message ?? ''}`);
    return json.data;
  };
  /** Loescht alle Dokumente des Testbenutzers im Testjahr (abhaengige Ressourcen zuerst). */
  const leeren = async (): Promise<void> => {
    for (const resource of [...RESSOURCEN].reverse()) {
      const docs = await api<Doc[]>('GET', `${resource}/${JAHR}`);
      if (docs.length > 0) await api('POST', `${resource}/bulk`, { delete: docs.map(doc => doc._id) });
    }
  };

  return {
    name: `echtes Backend ${url} (Benutzer ${USER})`,
    async vorbereiten() {
      const login = await api<{ accessToken: string }>('POST', 'auth/login', {
        userName: USER,
        password: PASSWORD,
      }).catch(async () => {
        console.log(`  Testbenutzer ${USER} wird angelegt (Zugangscode ${ACCESS_CODE})`);
        return api<{ accessToken: string }>('POST', 'auth/register', {
          userName: USER,
          email: `${USER}@deutschebahn.com`,
          password: PASSWORD,
          accessCode: ACCESS_CODE,
        });
      });
      token = login.accessToken;

      // Alle vier Features aktiv (EA ist fuer Alt-Profile nicht Standard); gueltige 8-stellige Personalnummer, sonst
      // scheitert das Einsammeln der Einstellungen beim Speichern (aeltere Vorlagen lieferten 7 Stellen).
      const profil = await api<
        Record<string, unknown> & { Pers: Record<string, unknown>; Einstellungen: Record<string, unknown> }
      >('GET', 'user-profiles/me');
      const { _id: _profilId, User: _user, createdAt: _createdAt, updatedAt: _updatedAt, __v: _v, ...rest } = profil;
      const pNummer = /^\d{8}$/.test(String(profil.Pers.PNummer)) ? profil.Pers.PNummer : '01234567';
      await api('PUT', 'user-profiles/me', {
        ...rest,
        Pers: { ...profil.Pers, PNummer: pNummer },
        Einstellungen: { ...profil.Einstellungen, aktivierteTabs: ['bereitschaft', 'ewt', 'neben', 'ea'] },
      });

      await leeren();
      const ids: Partial<Ids> = {};
      for (const resource of RESSOURCEN) {
        const eintraege = testdokumente(ids)[resource];
        // Der Server verlangt UUIDs als `clientRequestId`; die Zuordnung zum Schluessel laeuft ueber `anfrage`.
        const anfrage = new Map<string, IdKey>(eintraege.map(([key]) => [crypto.randomUUID(), key]));
        const result = await api<{ createdReferences: { _id: string; clientRequestId: string }[]; errors: unknown[] }>(
          'POST',
          `${resource}/bulk`,
          {
            create: [...anfrage.keys()].map((clientRequestId, index) => ({ ...eintraege[index][1], clientRequestId })),
          },
        );
        if (result.errors.length > 0) throw new Error(`Anlegen ${resource}: ${JSON.stringify(result.errors)}`);
        for (const reference of result.createdReferences) ids[anfrage.get(reference.clientRequestId)!] = reference._id;
      }
      return ids as Ids;
    },
    async abfangen(request, apiBase) {
      // Die anderen Server aus `API_URL` gelten als nicht erreichbar, damit die App das gewuenschte Backend nimmt.
      if (apiBase === url) return false;
      await request.abort('connectionrefused');
      return true;
    },
    async existiert(resource, id) {
      return (await api<Doc[]>('GET', `${resource}/${JAHR}`)).some(doc => doc._id === id);
    },
    async aufraeumen() {
      if (token) await leeren().catch(error => console.log(`Aufraeumen fehlgeschlagen: ${String(error)}`));
    },
  };
}

// ─── Pruefungen ──────────────────────────────────────────

const ergebnisse: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, info?: unknown): void {
  ergebnisse.push({ name, ok });
  console.log(`${ok ? '  ✔' : '  ✘'} ${name}${ok || info === undefined ? '' : `  -> ${JSON.stringify(info)}`}`);
}

/** Zeilen einer Tabelle im aktuellen Monatsfilter (`CustomTable.rows.getFilteredRows`). */
async function sichtbareZeilen(page: Page, tableId: string): Promise<number | null> {
  return page.evaluate(id => {
    const table = document.querySelector(`#${id}`) as unknown as {
      instance?: { rows: { getFilteredRows(): unknown[] } };
    } | null;
    return table?.instance ? table.instance.rows.getFilteredRows().length : null;
  }, tableId);
}

/** Wert eines Storage-Keys (Ressourcen sind als `{ data, timestamp }` gespeichert). */
async function storage<T>(page: Page, key: string): Promise<T | null> {
  return page.evaluate(k => {
    const raw = localStorage.getItem(k);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as { data?: unknown };
    return (parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed) as never;
  }, key) as Promise<T | null>;
}

async function warteBis(page: Page, fn: (arg: string) => boolean, arg = '', timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(fn, { timeout, polling: 100 }, arg);
    return true;
  } catch {
    return false;
  }
}

// ─── Ablauf ──────────────────────────────────────────────

const backend = BACKEND ? echtesBackend(BACKEND) : fakeBackend();
const apiBasen = BACKEND && !API_BASES.includes(BACKEND) ? [...API_BASES, BACKEND] : API_BASES;
console.log(`Live-Test gegen ${BASE}, ${backend.name}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !HEADFUL,
  slowMo: SLOW,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const seitenfehler: string[] = [];
const konsolenfehler: string[] = [];
/** Mitschnitt der API-Aufrufe der App an das gewaehlte Backend (`METHODE pfad`). */
const apiLog: string[] = [];
page.on('pageerror', error => seitenfehler.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error') konsolenfehler.push(message.text());
});
await page.setRequestInterception(true);
page.on('request', request => {
  const url = request.url();
  const apiBase = apiBasen.find(candidate => url.startsWith(candidate));
  if (!apiBase) {
    void request.continue();
    return;
  }
  if (request.method() !== 'OPTIONS' && (!BACKEND || apiBase === BACKEND))
    apiLog.push(
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

try {
  console.log('0. Testdaten anlegen');
  const ids = await backend.vorbereiten();
  check('Testdaten angelegt', Object.values(ids).length === 9 && Object.values(ids).every(Boolean), ids);

  await page.goto(BASE, { waitUntil: 'networkidle2' });

  // 1. Login
  console.log('1. Login + Laden');
  let loginFeld = await page.$('#Benutzer');
  if (!loginFeld) {
    await page.evaluate(() => (document.querySelector('#btnLogin') as HTMLElement | null)?.click());
    loginFeld = await page.waitForSelector('#Benutzer', { timeout: 5000 }).catch(() => null);
  }
  check('Login-Formular erreichbar', loginFeld !== null);
  await page.type('#Benutzer', USER);
  await page.type('#Passwort', PASSWORD);
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
  check('Nach Login: Tabellen gemountet und Daten im Storage', geladen);
  for (const pfad of RESSOURCEN)
    check(`GET ${pfad}/${JAHR} (createResourceEndpoints)`, apiLog.includes(`GET ${pfad}/${JAHR}`), apiLog);

  // 2. Mapper + Monatsfilter + Berechnung
  console.log('2. Mapper, Monatsfilter, Berechnung');
  const dataN = await storage<Record<string, unknown>[]>(page, 'dataN');
  const n1 = dataN?.find(row => row._id === ids.n1);
  check(
    'nebengeldFromBackend: Tag als DD.MM.YYYY, Verweis auf e1, zulagenAnzeigeN',
    n1?.Tag === '01.09.2026' && n1?.EWT === ids.e1 && Boolean(n1?.zulagenAnzeigeN),
    n1,
  );
  const dataE = await storage<Record<string, unknown>[]>(page, 'dataE');
  check('ewtFromBackend: Tag als YYYY-MM-DD', dataE?.find(row => row._id === ids.e1)?.Tag === '2026-09-01', dataE?.[0]);
  const dataBE = await storage<Record<string, unknown>[]>(page, 'dataBE');
  check('beFromBackend: Tag als DD.MM.YYYY', dataBE?.[0]?.Tag === '07.09.2026', dataBE?.[0]);

  const erwartet: Record<string, number> = { tableBZ: 2, tableBE: 1, tableE: 3, tableN: 1, tableEA: 2 };
  for (const [tableId, anzahl] of Object.entries(erwartet)) {
    const ist = await sichtbareZeilen(page, tableId);
    check(`${tableId}: ${anzahl} Zeile(n) im Monat ${MONAT}`, ist === anzahl, ist);
  }
  const berechnung = await storage<Record<string, Record<string, unknown>>>(page, 'datenBerechnung');
  const buckets = berechnung?.[MONAT] ? Object.keys(berechnung[MONAT]) : [];
  check('Berechnung: Buckets fuer Monat 9 aus allen Features', buckets.length >= 4, buckets);

  // 3. Ueberschneidungspruefung (nur lokal, nichts wird gesendet)
  console.log('3. Ueberschneidungspruefung');
  const overlap = await page.evaluate(
    async (bz1: string, e3: string) => {
      const { findOverlapBlockedRows } = (await import('/ts/shared/lib/autosave/overlapGuard.ts' as string)) as {
        findOverlapBlockedRows(resource: string, table: unknown): unknown[];
      };
      type Tbl = {
        rows: {
          array: { _state: string; deleteRow(): void }[];
          add(value: Record<string, unknown>, state?: string): void;
          findById(id: string): { deleteRow(): void; undoDelete(): void } | undefined;
        };
      };
      const ergebnis: Record<string, number> = {};
      const pruefe = (tableId: string, key: string, id: string, neu: Record<string, unknown>) => {
        const table = (document.querySelector(`#${tableId}`) as unknown as { instance: Tbl }).instance;
        const row = table.rows.findById(id)!;
        row.deleteRow();
        table.rows.add(neu, 'new');
        ergebnis[key] = findOverlapBlockedRows(key, table).length;
        // Aufraeumen: neue Zeile entfernen, Loeschung zuruecknehmen.
        table.rows.array.find(r => r._state === 'new')?.deleteRow();
        row.undoDelete();
        ergebnis[`${key}-danach`] = findOverlapBlockedRows(key, table).length;
      };
      pruefe('tableBZ', 'BZ', bz1, { Beginn: '2026-09-07T20:00:00.000Z', Ende: '2026-09-08T02:00:00.000Z', Pause: 0 });
      pruefe('tableE', 'EWT', e3, {
        Tag: '2026-09-03',
        Buchungstag: '2026-09-03',
        Einsatzort: 'X',
        Schicht: 'T',
        beginE: '08:00',
        endeE: '09:00',
        berechnen: true,
      });
      return ergebnis;
    },
    ids.bz1,
    ids.e3,
  );
  check('BZ: neue Zeile ueber geloeschter blockiert (overlapWindow aus ber/meta)', overlap.BZ === 1, overlap);
  check('EWT: neue Zeile ueber geloeschter blockiert (overlapWindow aus ewt/meta)', overlap.EWT === 1, overlap);
  check('Nach Aufraeumen: nichts blockiert', overlap['BZ-danach'] === 0 && overlap['EWT-danach'] === 0, overlap);

  // 4. EWT loeschen + Speichern -> onDeleted -> ewt:deleted -> Verweise in EZ/EA geloest
  console.log('4. EWT loeschen + Speichern');
  const vorher = apiLog.length;
  await page.evaluate((e1: string) => {
    const table = (
      document.querySelector('#tableE') as unknown as {
        instance: { rows: { findById(id: string): { deleteRow(): void } | undefined } };
      }
    ).instance;
    table.rows.findById(e1)!.deleteRow();
    (document.querySelector('#btnSaveE') as HTMLElement).click();
  }, ids.e1);
  const geloest = await warteBis(
    page,
    (n1Id: string) => {
      const raw = localStorage.getItem('dataN');
      const n = raw ? (JSON.parse(raw) as { data: { _id: string; EWT?: string }[] }).data : [];
      return n.some(row => row._id === n1Id && !row.EWT);
    },
    ids.n1,
  );
  const neueAufrufe = apiLog.slice(vorher);
  check(
    'Server-Aufruf loescht e1',
    neueAufrufe.some(
      a => a === `DELETE einsatzwechseltaetigkeit/${ids.e1}` || a === 'POST einsatzwechseltaetigkeit/bulk',
    ),
    neueAufrufe,
  );
  check('Backend: e1 entfernt', !(await backend.existiert('einsatzwechseltaetigkeit', ids.e1)));
  check('EZ: Verweis n1 -> e1 geloest (onDeleted -> ewt:deleted)', geloest, await storage(page, 'dataN'));
  const dataEA = await storage<{ _id: string; EWT?: string }[]>(page, 'dataEA');
  check('EA: Verweis ea1 -> e1 geloest', dataEA?.find(r => r._id === ids.ea1)?.EWT === undefined, dataEA);
  check('EA: Verweis ea2 -> e2 bleibt', dataEA?.find(r => r._id === ids.ea2)?.EWT === ids.e2, dataEA);
  check('Tabelle EWT: 2 Zeilen', (await sichtbareZeilen(page, 'tableE')) === 2);

  check('Keine unbehandelten Seitenfehler', seitenfehler.length === 0, seitenfehler);
} catch (error) {
  check('Ablauf ohne Ausnahme', false, String(error));
  const bild = `${tmpdir()}/livetest-fehler.png`;
  await page.screenshot({ path: bild }).catch(() => undefined);
  console.log(`Screenshot: ${bild}`);
} finally {
  if (konsolenfehler.length > 0)
    console.log(`\nKonsolenfehler (${konsolenfehler.length}):\n  ${konsolenfehler.slice(0, 15).join('\n  ')}`);
  await browser.close();
  await backend.aufraeumen();
}

const fehler = ergebnisse.filter(e => !e.ok);
console.log(`\n${ergebnisse.length - fehler.length}/${ergebnisse.length} Pruefungen ok`);
process.exit(fehler.length > 0 ? 1 : 0);
