import { FetchRetry } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import { notifyActAsStateChanged } from '@/infrastructure/ui/actAsStatus';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { TUserRole } from '@/types';
import type { ApiResponse as SharedApiResponse } from '@otto-kirchheim/nebengeld-shared';

type ApiResponse<T> = SharedApiResponse<T> & { statusCode?: number };

type BackendUser = {
  _id: string;
  userName: string;
  email?: string;
  emailVerified?: boolean;
  role: TUserRole;
  adminForTeamOes?: string[];
  adminForOrganizationOes?: string[];
  canEditVorgabenGeld?: boolean;
  canEditProfileTemplates?: boolean;
  canEditOwnTeamTemplatesOnly?: boolean;
};

type CurrentUserCapabilities = {
  role: TUserRole;
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
};

type BackendUserProfile = {
  Pers?: {
    OE?: string;
    Vorname?: string;
    Nachname?: string;
  };
};

type BackendVorgabeValue = Record<string, number | undefined>;

export type BackendVorgabe = {
  _id: number;
  Vorgaben: Array<{ key: number; value: BackendVorgabeValue }>;
  updatedAt?: string;
};

export type BackendProfileTemplate = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  template?: {
    Pers?: Record<string, unknown>;
    Fahrzeit?: Array<{ key: string; text: string; value: string }>;
    Arbeitszeit?: Record<string, unknown>;
    VorgabenB?: Array<{ key: string; value: Record<string, unknown> }>;
    Einstellungen?: Record<string, unknown>;
  };
  updatedAt?: string;
};

export type AdminUserRow = {
  _id: string;
  userName: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  role: TUserRole;
  oe: string;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
};

function unwrapResponse<T>(response: unknown): T {
  if (response instanceof Error) throw response;
  const payload = response as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? 'API-Fehler');
  return (payload.data ?? null) as T;
}

async function fetchUserProfileSummary(userId: string): Promise<{ oe: string; fullName: string }> {
  try {
    const response = await FetchRetry<undefined, BackendUserProfile>(`user-profiles/user/${userId}`, undefined, 'GET');
    const profile = unwrapResponse<BackendUserProfile>(response);
    const vorname = profile.Pers?.Vorname?.trim() ?? '';
    const nachname = profile.Pers?.Nachname?.trim() ?? '';
    const fullName = `${vorname} ${nachname}`.trim();

    return {
      oe: profile.Pers?.OE ?? '',
      fullName,
    };
  } catch {
    return { oe: '', fullName: '' };
  }
}

export async function fetchAdminUsers(filter: { name?: string; role?: string }): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  if (filter.name) params.set('search', filter.name);
  if (filter.role) params.set('role', filter.role);
  const query = params.toString();
  const path = query ? `users?${query}` : 'users';

  const response = await FetchRetry<undefined, BackendUser[]>(path, undefined, 'GET');
  const users = unwrapResponse<BackendUser[]>(response);

  const rows = await Promise.all(
    users.map(async user => {
      const profileSummary = await fetchUserProfileSummary(user._id);
      return {
        _id: user._id,
        userName: user.userName,
        email: user.email ?? '',
        emailVerified: Boolean(user.emailVerified),
        fullName: profileSummary.fullName,
        role: user.role,
        oe: profileSummary.oe,
        adminForTeamOes: user.adminForTeamOes ?? [],
        adminForOrganizationOes: user.adminForOrganizationOes ?? [],
        canEditVorgabenGeld: Boolean(user.canEditVorgabenGeld),
        canEditProfileTemplates: Boolean(user.canEditProfileTemplates),
        canEditOwnTeamTemplatesOnly: Boolean(user.canEditOwnTeamTemplatesOnly),
      };
    }),
  );

  return rows;
}

export async function updateUserScopes(
  userId: string,
  data: {
    adminForTeamOes: string[];
    adminForOrganizationOes: string[];
    canEditVorgabenGeld?: boolean;
    canEditProfileTemplates?: boolean;
    canEditOwnTeamTemplatesOnly?: boolean;
  },
): Promise<void> {
  const response = await FetchRetry<typeof data, BackendUser>(`users/${userId}`, data, 'PUT');
  unwrapResponse<BackendUser>(response);
}

export async function fetchCurrentAdminCapabilities(): Promise<CurrentUserCapabilities> {
  const response = await FetchRetry<undefined, BackendUser>('auth/me', undefined, 'GET');
  const user = unwrapResponse<BackendUser>(response);

  const isTeamAdminOrHigher = user.role === 'team-admin' || user.role === 'org-admin' || user.role === 'super-admin';
  const canEditProfileTemplates =
    user.role === 'super-admin' || (isTeamAdminOrHigher && Boolean(user.canEditProfileTemplates));

  return {
    role: user.role,
    canEditVorgabenGeld: user.role === 'super-admin' || (isTeamAdminOrHigher && Boolean(user.canEditVorgabenGeld)),
    canEditProfileTemplates,
    canEditOwnTeamTemplatesOnly:
      user.role === 'super-admin' ? false : canEditProfileTemplates && Boolean(user.canEditOwnTeamTemplatesOnly),
  };
}

export async function updateUserRole(userId: string, role: TUserRole): Promise<void> {
  const response = await FetchRetry<{ role: TUserRole }, BackendUser>(`users/${userId}/role`, { role }, 'PATCH');
  unwrapResponse<BackendUser>(response);
}

export async function updateUserOe(userId: string, oe: string): Promise<void> {
  const response = await FetchRetry<{ Pers: { OE: string } }, BackendUserProfile>(
    `user-profiles/user/${userId}`,
    { Pers: { OE: oe } },
    'PUT',
  );
  unwrapResponse<BackendUserProfile>(response);
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const response = await FetchRetry<{ newPassword: string }, unknown>(
    `users/${userId}/password`,
    { newPassword },
    'PATCH',
  );
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Passwort wurde gesetzt', status: 'success', timeout: 2000 });
}

/** Vom Backend genau einmal ausgelieferter Verifizierungs-/Reset-Link (wird nie persistiert). */
export type AdminIssuedLink = {
  url: string;
  expiresAt: string;
  mailSent: boolean;
};

export async function issueVerificationLink(userId: string): Promise<AdminIssuedLink> {
  const response = await FetchRetry<undefined, AdminIssuedLink>(`users/${userId}/verification-link`, undefined, 'POST');
  return unwrapResponse<AdminIssuedLink>(response);
}

export async function issuePasswordResetLink(userId: string): Promise<AdminIssuedLink> {
  const response = await FetchRetry<undefined, AdminIssuedLink>(
    `users/${userId}/password-reset-link`,
    undefined,
    'POST',
  );
  return unwrapResponse<AdminIssuedLink>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`users/${userId}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Benutzer wurde gelöscht', status: 'success', timeout: 2000 });
}

export function setActAsUser(userId: string | null, userName?: string): void {
  if (!userId) {
    Storage.remove('actAsUserId');
    Storage.remove('actAsUserName');
    notifyActAsStateChanged();
    return;
  }

  Storage.set('actAsUserId', userId);
  if (userName) Storage.set('actAsUserName', userName);
  notifyActAsStateChanged();
}

export async function fetchVorgabenYears(): Promise<BackendVorgabe[]> {
  const response = await FetchRetry<undefined, BackendVorgabe[]>('vorgaben', undefined, 'GET');
  return unwrapResponse<BackendVorgabe[]>(response);
}

export async function fetchVorgabeByYear(year: number): Promise<BackendVorgabe> {
  const response = await FetchRetry<undefined, BackendVorgabe>(`vorgaben/${year}`, undefined, 'GET');
  return unwrapResponse<BackendVorgabe>(response);
}

export async function upsertVorgabeByYear(
  year: number,
  vorgaben: Array<{ key: number; value: BackendVorgabeValue }>,
): Promise<BackendVorgabe> {
  const response = await FetchRetry<{ Vorgaben: Array<{ key: number; value: BackendVorgabeValue }> }, BackendVorgabe>(
    `vorgaben/${year}`,
    { Vorgaben: vorgaben },
    'PUT',
  );
  const updated = unwrapResponse<BackendVorgabe>(response);
  createSnackBar({ message: `Vorgaben ${year} gespeichert`, status: 'success', timeout: 2000 });
  return updated;
}

export async function deleteVorgabeByYear(year: number): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`vorgaben/${year}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: `Vorgaben ${year} gelöscht`, status: 'success', timeout: 2000 });
}

export async function fetchProfileTemplates(): Promise<BackendProfileTemplate[]> {
  const response = await FetchRetry<undefined, BackendProfileTemplate[]>('profile-templates', undefined, 'GET');
  return unwrapResponse<BackendProfileTemplate[]>(response);
}

export async function createProfileTemplate(
  payload: Pick<BackendProfileTemplate, 'code' | 'name' | 'description' | 'active' | 'template'>,
): Promise<BackendProfileTemplate> {
  const response = await FetchRetry<typeof payload, BackendProfileTemplate>('profile-templates', payload, 'POST');
  const created = unwrapResponse<BackendProfileTemplate>(response);
  createSnackBar({ message: `Template ${created.code} erstellt`, status: 'success', timeout: 2000 });
  return created;
}

export async function updateProfileTemplate(
  id: string,
  payload: Partial<Pick<BackendProfileTemplate, 'code' | 'name' | 'description' | 'active' | 'template'>>,
): Promise<BackendProfileTemplate> {
  const response = await FetchRetry<typeof payload, BackendProfileTemplate>(`profile-templates/${id}`, payload, 'PUT');
  const updated = unwrapResponse<BackendProfileTemplate>(response);
  createSnackBar({ message: `Template ${updated.code} aktualisiert`, status: 'success', timeout: 2000 });
  return updated;
}

export async function deleteProfileTemplate(id: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`profile-templates/${id}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Template gelöscht', status: 'success', timeout: 2000 });
}

// ─── Admin Raw-Edit API ───────────────────────────────────

export type AdminStats = {
  users: { total: number; active30d: number; byRole: Record<string, number> };
  profiles: { total: number };
  templates: { total: number; active: number; inactive: number };
  resources: {
    bereitschaftseinsaetze: number;
    bereitschaftszeitraeume: number;
    einsatzwechseltaetigkeiten: number;
    nebengeld: number;
  };
  adminActivity: { logsLast7d: number };
  auth: { newUsersLast7d: number; emailVerified: number; passkeyUsers: number };
  growth: {
    bereitschaftseinsaetzeLast7d: number;
    bereitschaftszaetraumeLast7d: number;
    ewtLast7d: number;
    nebengeldLast7d: number;
  };
};

export type AdminPage = {
  data: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
};

export type AdminPasskey = {
  index: number;
  name?: string;
  credentialId: string;
  deviceType?: string;
  createdAt?: string;
  lastUsedAt?: string;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await FetchRetry<undefined, AdminStats>('admin/stats', undefined, 'GET');
  return unwrapResponse<AdminStats>(response);
}

export async function fetchAdminResource(
  endpoint: string,
  params?: { page?: number; limit?: number; userId?: string; jahr?: number; monat?: number },
): Promise<AdminPage> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.userId) p.set('userId', params.userId);
  if (params?.jahr) p.set('Jahr', String(params.jahr));
  if (params?.monat) p.set('Monat', String(params.monat));
  const query = p.toString();
  const path = query ? `admin/${endpoint}?${query}` : `admin/${endpoint}`;
  const response = await FetchRetry<undefined, AdminPage>(path, undefined, 'GET');
  return unwrapResponse<AdminPage>(response);
}

export async function updateAdminDoc(
  endpoint: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await FetchRetry<Record<string, unknown>, Record<string, unknown>>(
    `admin/${endpoint}/${id}`,
    data,
    'PUT',
  );
  const updated = unwrapResponse<Record<string, unknown>>(response);
  createSnackBar({ message: 'Gespeichert', status: 'success', timeout: 2000 });
  return updated;
}

export async function deleteAdminDoc(endpoint: string, id: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`admin/${endpoint}/${id}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Gelöscht', status: 'success', timeout: 2000 });
}

export async function fetchAdminUserProfiles(params?: {
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<AdminPage> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.userId) p.set('userId', params.userId);
  const query = p.toString();
  const path = query ? `admin/user-profiles?${query}` : 'admin/user-profiles';
  const response = await FetchRetry<undefined, AdminPage>(path, undefined, 'GET');
  return unwrapResponse<AdminPage>(response);
}

export async function updateAdminUserProfileDoc(
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await FetchRetry<Record<string, unknown>, Record<string, unknown>>(
    `admin/user-profiles/${id}`,
    data,
    'PUT',
  );
  const updated = unwrapResponse<Record<string, unknown>>(response);
  createSnackBar({ message: 'UserProfile gespeichert', status: 'success', timeout: 2000 });
  return updated;
}

export async function setAdminEmailVerified(userId: string, emailVerified: boolean): Promise<void> {
  const response = await FetchRetry<{ emailVerified: boolean }, unknown>(
    `admin/users/${userId}/email-verified`,
    { emailVerified },
    'PATCH',
  );
  unwrapResponse<unknown>(response);
  createSnackBar({ message: `emailVerified → ${emailVerified}`, status: 'success', timeout: 2000 });
}

export async function fetchAdminPasskeys(userId: string): Promise<AdminPasskey[]> {
  const response = await FetchRetry<undefined, AdminPasskey[]>(`admin/users/${userId}/passkeys`, undefined, 'GET');
  return unwrapResponse<AdminPasskey[]>(response);
}

export async function deleteAdminPasskey(userId: string, credentialId: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(
    `admin/users/${userId}/passkeys/${credentialId}`,
    undefined,
    'DELETE',
  );
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Passkey gelöscht', status: 'success', timeout: 2000 });
}

/** Baut eine Map userId→Name aus UserProfile-Dokumenten (max. 200 Profile). */
export async function fetchAdminUserNameMap(): Promise<Record<string, string>> {
  const page = await fetchAdminUserProfiles({ limit: 200 });
  const map: Record<string, string> = {};
  for (const doc of page.data) {
    const userId = String(doc['User'] ?? '');
    if (!userId) continue;
    const pers = (doc['Pers'] ?? {}) as Record<string, unknown>;
    const name = [String(pers['Vorname'] ?? ''), String(pers['Nachname'] ?? '')].filter(Boolean).join(' ');
    map[userId] = name || `…${userId.slice(-8)}`;
  }
  return map;
}

export type AdminLogEntry = {
  _id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  targetResourceId?: string;
  params?: Record<string, unknown>;
  timestamp: string;
};

export async function fetchAdminResourceYears(endpoint: string): Promise<number[]> {
  const response = await FetchRetry<undefined, number[]>(`admin/${endpoint}?distinctJahr=1`, undefined, 'GET');
  return unwrapResponse<number[]>(response);
}

export async function fetchAdminUserEmailVerified(userId: string): Promise<{ emailVerified: boolean }> {
  const response = await FetchRetry<undefined, { emailVerified: boolean }>(`admin/users/${userId}`, undefined, 'GET');
  return unwrapResponse<{ emailVerified: boolean }>(response);
}

export async function fetchAdminResourceById(endpoint: string, id: string): Promise<Record<string, unknown>> {
  const response = await FetchRetry<undefined, Record<string, unknown>>(`admin/${endpoint}/${id}`, undefined, 'GET');
  return unwrapResponse<Record<string, unknown>>(response);
}

export type MetricPoint = {
  timestamp: string;
  environment?: 'gcp' | 'homeserver';
  event: 'startup' | 'periodic' | 'manual' | 'shutdown';
  /** Eindeutig pro Server-Prozessstart – fehlt bei Alt-Daten */
  sessionId?: string;
  uptime: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  eventLoopDelay: number;
};

export type HeapData = {
  current: {
    environment?: 'gcp' | 'homeserver';
    sessionId?: string;
    uptime: number;
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  history: MetricPoint[];
};

export async function fetchAdminHeap(days = 7): Promise<HeapData> {
  const response = await FetchRetry<undefined, HeapData>(`admin/heap?days=${days}`, undefined, 'GET');
  return unwrapResponse<HeapData>(response);
}

export async function triggerAdminHeapSnapshot(): Promise<MetricPoint> {
  const response = await FetchRetry<undefined, MetricPoint>('admin/heap', undefined, 'POST');
  return unwrapResponse<MetricPoint>(response);
}

export async function fetchAdminLogs(params?: {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  from?: string;
  to?: string;
}): Promise<AdminPage> {
  const p = new URLSearchParams();
  if (params?.page) p.set('page', String(params.page));
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.adminId) p.set('adminId', params.adminId);
  if (params?.action) p.set('action', params.action);
  if (params?.from) p.set('from', params.from);
  if (params?.to) p.set('to', params.to);
  const query = p.toString();
  const path = query ? `admin/logs?${query}` : 'admin/logs';
  const response = await FetchRetry<undefined, AdminPage>(path, undefined, 'GET');
  return unwrapResponse<AdminPage>(response);
}
