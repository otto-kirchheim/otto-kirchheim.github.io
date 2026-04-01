import { FetchRetry } from '../../utilities/FetchRetry';
import { Storage } from '../../utilities';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { TUserRole } from '../../interfaces';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
};

type BackendUser = {
  _id: string;
  userName: string;
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

export async function deleteUser(userId: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`users/${userId}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Benutzer wurde gelöscht', status: 'success', timeout: 2000 });
}

export function setActAsUser(userId: string | null, userName?: string): void {
  if (!userId) {
    Storage.remove('actAsUserId');
    Storage.remove('actAsUserName');
    return;
  }

  Storage.set('actAsUserId', userId);
  if (userName) Storage.set('actAsUserName', userName);
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
