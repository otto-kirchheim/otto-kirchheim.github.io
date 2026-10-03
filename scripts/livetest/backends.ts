/**
 * Testdaten sowie Fake- und echtes Backend der Browser-Skripte (`livetest.ts`, `sichtvergleich.ts`).
 */

import type { HTTPRequest } from 'puppeteer';
import { VorgabenGeldMock, VorgabenUMock } from '../../test/mockData';
import packageJson from '../../package.json';
import { fakeAdminAntwort } from './adminDaten';

export const JAHR = 2026;
export const MONAT = 9;

/** Server-URLs aus `API_URL` (Dev, `FetchRetry.ts`); die App nimmt den ersten erreichbaren. */
export const API_BASES = [
  'https://api-dev.otto.home64.de/api/v2',
  'http://localhost:8081/api/v2',
  'http://192.168.178.56:8081/api/v2',
];

/** API-Pfadsegmente der Feature-Ressourcen (`createResourceEndpoints` in `features/<id>/model/backend.ts`). */
export const RESSOURCEN = [
  'bereitschaftszeitraum',
  'bereitschaftseinsatz',
  'einsatzwechseltaetigkeit',
  'nebengeld',
  'ea',
];

// ─── Testdaten ───────────────────────────────────────────

export type Doc = Record<string, unknown> & { _id: string };
export type IdKey = 'bz1' | 'bz2' | 'be1' | 'e1' | 'e2' | 'e3' | 'n1' | 'ea1' | 'ea2';
export type Ids = Record<IdKey, string>;

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

export interface Backend {
  name: string;
  /** Legt die Testdaten an und liefert deren `_id`s. */
  vorbereiten(): Promise<Ids>;
  /** Beantwortet oder steuert einen API-Request der App; `true`, wenn er damit erledigt ist. */
  abfangen(request: HTTPRequest, apiBase: string): Promise<boolean>;
  existiert(resource: string, id: string): Promise<boolean>;
  aufraeumen(): Promise<void>;
  /** Nur Fake-Backend: zuletzt per `PUT profile-templates/<id>` gespeicherter Vorlagen-Inhalt. */
  gespeicherteVorlage?(): Record<string, unknown> | undefined;
}

/** Endpunkte des Admin-Ressourcenbrowsers (`pages/admin/features/<id>/index.ts`). */
const ADMIN_RESSOURCEN = [
  'bereitschaftseinsaetze',
  'bereitschaftszeitraeume',
  'einsatzwechseltaetigkeiten',
  'nebengeld',
  'entgeltausgleich',
];

/** EWT-Dokument im Admin-Ressourcenbrowser des Fake-Backends (Schritt 7). */
const FAKE_ADMIN_EWT = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  User: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  Jahr: JAHR,
  Monat: MONAT,
  Tag: '2026-09-03T00:00:00.000Z',
  Buchungstag: '2026-09-03T00:00:00.000Z',
  Einsatzort: 'Kirchheim',
  Schicht: 'T',
  beginE: '08:00',
  createdAt: '2026-09-03T06:30:00.000Z',
};

/** Profil-Vorlage des Fake-Backends (Schritt 6); `eigenesFeld` prueft, dass Unbekanntes erhalten bleibt. */
export const FAKE_VORLAGE = {
  _id: 'tpl1',
  code: 'livetest',
  name: 'Livetest-Vorlage',
  description: '',
  active: true,
  template: {
    Pers: { Vorname: 'Max', PNummer: '01234567' },
    Fahrzeit: [{ key: 'Kirchheim', text: 'km 196,5', value: '00:10' }],
    VorgabenB: [
      {
        key: '1',
        value: {
          Name: 'Woche',
          beginnB: { tag: 1, zeit: '15:00' },
          endeB: { tag: 1, zeit: '07:00', Nwoche: true },
          schichten: ['frueh'],
          nacht: false,
          beginnN: { tag: 1, zeit: '', Nwoche: false },
          endeN: { tag: 1, zeit: '', Nwoche: false },
          standard: true,
          eigenesFeld: 'bleibt',
        },
      },
    ],
    Einstellungen: { aktivierteTabs: ['bereitschaft', 'ewt'], benoetigteZulagen: ['040'] },
  },
};

/**
 * Fake-Backend im Speicher, beantwortet die API-Aufrufe per Request-Interception.
 *
 * @param user - Benutzername.
 * @param rolle - Rolle des Benutzers; Standard Team-Admin (Schritt 6), `super-admin` zeigt alle Admin-Unter-Tabs.
 * @returns Backend.
 */
export function fakeBackend(user: string, rolle = 'team-admin'): Backend {
  const db: Record<string, Doc[]> = {};
  const unbekannt = new Set<string>();
  const base64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwt = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
    userName: user,
    role: rolle,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`;
  const profil = {
    _id: 'p1',
    User: user,
    Pers: { ...VorgabenUMock.Pers, OE: [VorgabenUMock.Pers.OE] },
    Arbeitszeit: VorgabenUMock.Arbeitszeit,
    Fahrzeit: VorgabenUMock.Fahrzeit,
    VorgabenB: Object.entries(VorgabenUMock.VorgabenB).map(([key, value]) => ({ key, value })),
    Einstellungen: { ...VorgabenUMock.Einstellungen, aktivierteTabs: ['bereitschaft', 'ewt', 'neben', 'ea'] },
    updatedAt: stamp(),
  };
  const vorlage = structuredClone(FAKE_VORLAGE);
  let gespeichert: Record<string, unknown> | undefined;
  const neu = (head: string, fields: Record<string, unknown>): Doc => {
    const { clientRequestId: _clientRequestId, ...rest } = fields;
    const doc = { ...rest, _id: `${head}-${crypto.randomUUID().slice(0, 8)}`, updatedAt: stamp() } as Doc;
    (db[head] ??= []).push(doc);
    return doc;
  };

  const antwort = (
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
  ): { status: number; data: unknown } => {
    const segs = path.split('/').filter(Boolean);
    const [head, second] = segs;
    if (segs.length === 0) return { status: 200, data: { min_frontend_version: '0.0.0' } };
    if (path === 'auth/login' || path === 'auth/refresh-token')
      return {
        status: 200,
        data: { user: { userName: user, role: rolle }, accessToken: jwt, refreshToken: 'rt' },
      };
    // Team-Admin mit Vorlagen-Recht: Schritt 6 prueft den Profil-Vorlagen-Editor.
    if (path === 'auth/me')
      return {
        status: 200,
        data: {
          userName: user,
          role: rolle,
          canEditProfileTemplates: true,
          email: 'live@test.de',
          emailVerified: true,
        },
      };
    if (path === 'profile-templates') return { status: 200, data: [vorlage] };
    // Ressourcenbrowser (Schritt 7): Seiten je Ressource, nur die EWT mit einem Dokument (reines Datums- und Zeitfeld).
    if (head === 'admin' && ADMIN_RESSOURCEN.includes(second ?? '') && segs.length === 2) {
      if (query.has('distinctJahr')) return { status: 200, data: [JAHR] };
      const docs = second === 'einsatzwechseltaetigkeiten' ? [FAKE_ADMIN_EWT] : [];
      return { status: 200, data: { data: docs, total: docs.length, limit: 25, skip: 0 } };
    }
    if (head === 'profile-templates' && method === 'PUT' && second === vorlage._id) {
      Object.assign(vorlage, body as object);
      gespeichert = (body as { template?: Record<string, unknown> }).template;
      return { status: 200, data: vorlage };
    }
    if (path === 'user-profiles/me') {
      if (method === 'PUT') Object.assign(profil, body as object, { updatedAt: stamp() });
      return { status: 200, data: profil };
    }
    const admin = fakeAdminAntwort(method, path);
    if (admin) return admin;
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
    gespeicherteVorlage: () => gespeichert,
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
      const url = new URL(request.url());
      const path = url.pathname.replace(new URL(apiBase).pathname, '').replace(/^\//, '');
      const raw = request.hasPostData() ? await request.fetchPostData() : undefined;
      const { status, data } = antwort(request.method(), path, raw ? JSON.parse(raw) : undefined, url.searchParams);
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

/** Zugang des Testbenutzers im echten Backend. */
export interface Zugang {
  user: string;
  password: string;
  /** Zugangscode fuer die Registrierung beim ersten Lauf. */
  code: string;
}

/**
 * Echtes Backend: eigener Testbenutzer, Testdaten ueber die API anlegen und am Ende wieder loeschen.
 *
 * @param url - API-Basis-URL, z. B. `http://localhost:8081/api/v2`.
 * @param zugang - Testbenutzer.
 * @returns Backend.
 */
export function echtesBackend(url: string, zugang: Zugang): Backend {
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
    name: `echtes Backend ${url} (Benutzer ${zugang.user})`,
    async vorbereiten() {
      const login = await api<{ accessToken: string }>('POST', 'auth/login', {
        userName: zugang.user,
        password: zugang.password,
      }).catch(async () => {
        console.log(`  Testbenutzer ${zugang.user} wird angelegt (Zugangscode ${zugang.code})`);
        return api<{ accessToken: string }>('POST', 'auth/register', {
          userName: zugang.user,
          email: `${zugang.user}@deutschebahn.com`,
          password: zugang.password,
          accessCode: zugang.code,
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
