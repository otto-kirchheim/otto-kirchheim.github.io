/**
 * Feste Admin-Daten des Fake-Backends (`backends.ts`), damit die Admin-Unter-Tabs im Sichtvergleich Inhalt zeigen. Alle Werte
 * und Zeitstempel sind fest: zwei Laeufe muessen pixelgleiche Fotos liefern.
 */

import { VorgabenGeldMock } from '../../test/mockData';

const BENUTZER = [
  {
    _id: 'u0000000000000000000001',
    userName: 'jan',
    email: 'jan@deutschebahn.com',
    emailVerified: true,
    role: 'super-admin',
    canEditVorgabenGeld: true,
    canEditProfileTemplates: true,
  },
  {
    _id: 'u0000000000000000000002',
    userName: 'max',
    email: 'max@deutschebahn.com',
    emailVerified: false,
    role: 'member',
  },
];

const PROFIL = {
  _id: 'p0000000000000000000001',
  User: BENUTZER[0]._id,
  Pers: { Vorname: 'Jan', Nachname: 'Otto', OE: ['I.NA-MI-N-KSL-IL 03'], Betrieb: 'DB Netz AG' },
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const STATS = {
  users: { total: 2, active30d: 1, byRole: { 'super-admin': 1, member: 1 } },
  profiles: { total: 2 },
  templates: { total: 1, active: 1, inactive: 0 },
  resources: {
    bereitschaftseinsaetze: 12,
    bereitschaftszeitraeume: 8,
    einsatzwechseltaetigkeiten: 40,
    nebengeld: 15,
    entgeltausgleich: 6,
  },
  adminActivity: { logsLast7d: 3 },
  auth: { newUsersLast7d: 0, emailVerified: 1, passkeyUsers: 1 },
  growth: {
    bereitschaftseinsaetzeLast7d: 2,
    bereitschaftszaetraumeLast7d: 1,
    ewtLast7d: 5,
    nebengeldLast7d: 3,
    entgeltausgleichLast7d: 1,
  },
};

const heapPunkt = (stunde: number, heapUsed: number) => ({
  timestamp: `2026-09-01T${String(stunde).padStart(2, '0')}:00:00.000Z`,
  environment: 'homeserver',
  event: 'periodic',
  sessionId: 's1',
  uptime: stunde * 3600,
  rss: 150,
  heapUsed,
  heapTotal: 120,
  external: 5,
});

const HEAP = {
  current: {
    environment: 'homeserver',
    sessionId: 's1',
    uptime: 10_800,
    rss: 150,
    heapUsed: 82,
    heapTotal: 120,
    external: 5,
  },
  history: [heapPunkt(1, 70), heapPunkt(2, 78), heapPunkt(3, 82)],
};

const LOGS = [
  {
    _id: 'l0000000000000000000001',
    adminId: BENUTZER[0]._id,
    adminName: 'jan',
    action: 'user.update',
    targetId: BENUTZER[1]._id,
    details: { role: 'member' },
    createdAt: '2026-09-02T08:00:00.000Z',
  },
];

const seite = (data: object[]) => ({ data, total: data.length, limit: 25, skip: 0 });

/**
 * Antwort auf einen Admin-Aufruf, sofern er hierher gehoert.
 *
 * @param method - HTTP-Methode.
 * @param path - Pfad ohne API-Basis und Query.
 * @returns Status und Daten; `undefined`, wenn der Aufruf nicht zu den Admin-Daten gehoert.
 */
export function fakeAdminAntwort(method: string, path: string): { status: number; data: unknown } | undefined {
  if (method !== 'GET') return undefined;
  if (path === 'users') return { status: 200, data: BENUTZER };
  if (path.startsWith('user-profiles/user/')) return { status: 200, data: PROFIL };
  if (path === 'admin/stats') return { status: 200, data: STATS };
  if (path === 'admin/heap') return { status: 200, data: HEAP };
  if (path === 'admin/user-profiles') return { status: 200, data: seite([PROFIL]) };
  if (path === 'admin/logs') return { status: 200, data: seite(LOGS) };
  if (path === 'vorgaben')
    return { status: 200, data: [{ _id: 2026, Vorgaben: [{ key: 1, value: VorgabenGeldMock[1] }] }] };
  if (/^formulare\/[^/]+\/versionen$/.test(path)) return { status: 200, data: [] };
  return undefined;
}
