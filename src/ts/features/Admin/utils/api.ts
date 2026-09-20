import { FetchRetry } from '@/infrastructure/api/FetchRetry';
import Storage from '@/infrastructure/storage/Storage';
import { notifyActAsStateChanged } from '@/infrastructure/ui/actAsStatus';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { TUserRole } from '@/types';
import {
  Role,
  ROLE_HIERARCHY,
  type ApiResponse as SharedApiResponse,
  type IVorgabeEntry,
  type IUserAdminRow,
} from '@otto-kirchheim/nebengeld-shared';

type ApiResponse<T> = SharedApiResponse<T> & { statusCode?: number };

/** Wie shared `IUserAdminRow` beschrieben -- das Backend hat kein eigenes DTO dafür, siehe dort. */
type BackendUser = IUserAdminRow;

type CurrentUserCapabilities = {
  role: TUserRole;
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
  canCreateFormularVorlagen: boolean;
  canEditFormularVorlagen: boolean;
};

type BackendUserProfile = {
  Pers?: {
    OE?: string[];
    Vorname?: string;
    Nachname?: string;
    Betrieb?: string;
  };
};

export type BackendVorgabe = {
  _id: number;
  Vorgaben: IVorgabeEntry[];
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
  /** OE als Hierarchie-Ebenen; Anzeige/Eingabe laufen über `joinOeLevels`/`splitOeInput`. */
  oe: string[];
  betrieb: string;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
  canCreateFormularVorlagen: boolean;
  canEditFormularVorlagen: boolean;
};

/**
 * Entpackt eine `FetchRetry`-Antwort und wirft bei Fehlern.
 *
 * @param response - Rohantwort oder `Error`.
 * @returns Nutzdaten (`null`, wenn keine vorhanden).
 * @throws {Error} Wenn `response` ein `Error` ist oder `success` fehlt (Backend-Meldung oder `'API-Fehler'`).
 */
function unwrapResponse<T>(response: unknown): T {
  if (response instanceof Error) throw response;
  const payload = response as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? 'API-Fehler');
  return (payload.data ?? null) as T;
}

/**
 * Lädt OE, Betrieb und vollen Namen eines Benutzers aus seinem Profil; bei jedem Fehler leere Werte, damit die Benutzerliste trotzdem entsteht.
 *
 * @param userId - Id des Benutzers.
 * @returns `oe`, `betrieb` und `fullName` (leer, wenn nicht ermittelbar).
 */
async function fetchUserProfileSummary(userId: string): Promise<{ oe: string[]; betrieb: string; fullName: string }> {
  try {
    const response = await FetchRetry<undefined, BackendUserProfile>(`user-profiles/user/${userId}`, undefined, 'GET');
    const profile = unwrapResponse<BackendUserProfile>(response);
    const vorname = profile.Pers?.Vorname?.trim() ?? '';
    const nachname = profile.Pers?.Nachname?.trim() ?? '';
    const fullName = `${vorname} ${nachname}`.trim();

    return {
      oe: profile.Pers?.OE ?? [],
      betrieb: profile.Pers?.Betrieb ?? '',
      fullName,
    };
  } catch {
    return { oe: [], betrieb: '', fullName: '' };
  }
}

/**
 * Lädt die Benutzerliste und ergänzt je Benutzer OE, Betrieb und Namen aus dem Profil.
 *
 * @param filter - Optional Suchtext `name` und `role`.
 * @returns Benutzerzeilen für die Verwaltung.
 */
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
        betrieb: profileSummary.betrieb,
        adminForTeamOes: user.adminForTeamOes ?? [],
        adminForOrganizationOes: user.adminForOrganizationOes ?? [],
        canEditVorgabenGeld: Boolean(user.canEditVorgabenGeld),
        canEditProfileTemplates: Boolean(user.canEditProfileTemplates),
        canEditOwnTeamTemplatesOnly: Boolean(user.canEditOwnTeamTemplatesOnly),
        canCreateFormularVorlagen: Boolean(user.canCreateFormularVorlagen),
        canEditFormularVorlagen: Boolean(user.canEditFormularVorlagen),
      };
    }),
  );

  return rows;
}

/**
 * Speichert Admin-Zuständigkeiten und Einzelrechte eines Benutzers.
 *
 * @param userId - Id des Benutzers.
 * @param data - Team-/Organisations-OEs und optionale Rechte-Flags.
 */
export async function updateUserScopes(
  userId: string,
  data: {
    adminForTeamOes: string[];
    adminForOrganizationOes: string[];
    canEditVorgabenGeld?: boolean;
    canEditProfileTemplates?: boolean;
    canEditOwnTeamTemplatesOnly?: boolean;
    canCreateFormularVorlagen?: boolean;
    canEditFormularVorlagen?: boolean;
  },
): Promise<void> {
  const response = await FetchRetry<typeof data, BackendUser>(`users/${userId}`, data, 'PUT');
  unwrapResponse<BackendUser>(response);
}

/**
 * Ermittelt die Admin-Rechte des angemeldeten Benutzers über `auth/me`. Super-Admins haben alle Rechte, Team-Admins und höher nur die gesetzten Flags; Bearbeiten von Formularen impliziert das Erstellen.
 *
 * @returns Rolle und effektive Rechte.
 */
export async function fetchCurrentAdminCapabilities(): Promise<CurrentUserCapabilities> {
  const response = await FetchRetry<undefined, BackendUser>('auth/me', undefined, 'GET');
  const user = unwrapResponse<BackendUser>(response);

  const isTeamAdminOrHigher = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[Role.TEAM_ADMIN];
  const canEditProfileTemplates =
    user.role === Role.SUPER_ADMIN || (isTeamAdminOrHigher && Boolean(user.canEditProfileTemplates));
  const canCreateFormularVorlagen =
    user.role === Role.SUPER_ADMIN || (isTeamAdminOrHigher && Boolean(user.canCreateFormularVorlagen));
  // Erstellen impliziert Bearbeiten, nicht umgekehrt.
  const canEditFormularVorlagen =
    user.role === Role.SUPER_ADMIN ||
    (isTeamAdminOrHigher && (Boolean(user.canEditFormularVorlagen) || Boolean(user.canCreateFormularVorlagen)));

  return {
    role: user.role,
    canEditVorgabenGeld: user.role === Role.SUPER_ADMIN || (isTeamAdminOrHigher && Boolean(user.canEditVorgabenGeld)),
    canEditProfileTemplates,
    canEditOwnTeamTemplatesOnly:
      user.role === Role.SUPER_ADMIN ? false : canEditProfileTemplates && Boolean(user.canEditOwnTeamTemplatesOnly),
    canCreateFormularVorlagen,
    canEditFormularVorlagen,
  };
}

/**
 * Setzt die Rolle eines Benutzers.
 *
 * @param userId - Id des Benutzers.
 * @param role - Neue Rolle.
 */
export async function updateUserRole(userId: string, role: TUserRole): Promise<void> {
  const response = await FetchRetry<{ role: TUserRole }, BackendUser>(`users/${userId}/role`, { role }, 'PATCH');
  unwrapResponse<BackendUser>(response);
}

/**
 * Setzt die OE-Ebenen im Profil eines Benutzers.
 *
 * @param userId - Id des Benutzers.
 * @param oe - Neue OE als Ebenen-Array.
 */
export async function updateUserOe(userId: string, oe: string[]): Promise<void> {
  const response = await FetchRetry<{ Pers: { OE: string[] } }, BackendUserProfile>(
    `user-profiles/user/${userId}`,
    { Pers: { OE: oe } },
    'PUT',
  );
  unwrapResponse<BackendUserProfile>(response);
}

/**
 * Setzt ein neues Passwort für einen Benutzer und zeigt eine Erfolgsmeldung.
 *
 * @param userId - Id des Benutzers.
 * @param newPassword - Neues Passwort im Klartext.
 */
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

/**
 * Erzeugt einen E-Mail-Verifizierungslink für einen Benutzer.
 *
 * @param userId - Id des Benutzers.
 * @returns Einmalig ausgelieferter Link samt Ablauf und Mailstatus.
 */
export async function issueVerificationLink(userId: string): Promise<AdminIssuedLink> {
  const response = await FetchRetry<undefined, AdminIssuedLink>(`users/${userId}/verification-link`, undefined, 'POST');
  return unwrapResponse<AdminIssuedLink>(response);
}

/**
 * Erzeugt einen Passwort-Zurücksetzen-Link für einen Benutzer.
 *
 * @param userId - Id des Benutzers.
 * @returns Einmalig ausgelieferter Link samt Ablauf und Mailstatus.
 */
export async function issuePasswordResetLink(userId: string): Promise<AdminIssuedLink> {
  const response = await FetchRetry<undefined, AdminIssuedLink>(
    `users/${userId}/password-reset-link`,
    undefined,
    'POST',
  );
  return unwrapResponse<AdminIssuedLink>(response);
}

/**
 * Löscht einen Benutzer und zeigt eine Erfolgsmeldung.
 *
 * @param userId - Id des Benutzers.
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`users/${userId}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Benutzer wurde gelöscht', status: 'success', timeout: 2000 });
}

/**
 * Schaltet die Stellvertreter-Ansicht (Act-as) ein oder aus und meldet die Änderung über `notifyActAsStateChanged`.
 *
 * @param userId - Id des Benutzers; `null` beendet Act-as.
 * @param userName - Anzeigename, wird nur bei gesetzter `userId` gespeichert.
 */
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

/**
 * Lädt die VorgabenGeld aller Jahre.
 *
 * @returns Vorgaben je Jahr.
 */
export async function fetchVorgabenYears(): Promise<BackendVorgabe[]> {
  const response = await FetchRetry<undefined, BackendVorgabe[]>('vorgaben', undefined, 'GET');
  return unwrapResponse<BackendVorgabe[]>(response);
}

/**
 * Lädt die VorgabenGeld eines Jahres.
 *
 * @param year - Jahr.
 * @returns Vorgaben des Jahres.
 */
export async function fetchVorgabeByYear(year: number): Promise<BackendVorgabe> {
  const response = await FetchRetry<undefined, BackendVorgabe>(`vorgaben/${year}`, undefined, 'GET');
  return unwrapResponse<BackendVorgabe>(response);
}

/**
 * Legt die VorgabenGeld eines Jahres an oder überschreibt sie und zeigt eine Erfolgsmeldung.
 *
 * @param year - Jahr.
 * @param vorgaben - Vorgabeneinträge des Jahres.
 * @returns Gespeicherte Vorgaben.
 */
export async function upsertVorgabeByYear(year: number, vorgaben: IVorgabeEntry[]): Promise<BackendVorgabe> {
  const response = await FetchRetry<{ Vorgaben: IVorgabeEntry[] }, BackendVorgabe>(
    `vorgaben/${year}`,
    { Vorgaben: vorgaben },
    'PUT',
  );
  const updated = unwrapResponse<BackendVorgabe>(response);
  createSnackBar({ message: `Vorgaben ${year} gespeichert`, status: 'success', timeout: 2000 });
  return updated;
}

/**
 * Löscht die VorgabenGeld eines Jahres und zeigt eine Erfolgsmeldung.
 *
 * @param year - Jahr.
 */
export async function deleteVorgabeByYear(year: number): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`vorgaben/${year}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: `Vorgaben ${year} gelöscht`, status: 'success', timeout: 2000 });
}

/**
 * Lädt alle Profil-Templates.
 *
 * @returns Templates.
 */
export async function fetchProfileTemplates(): Promise<BackendProfileTemplate[]> {
  const response = await FetchRetry<undefined, BackendProfileTemplate[]>('profile-templates', undefined, 'GET');
  return unwrapResponse<BackendProfileTemplate[]>(response);
}

/**
 * Legt ein Profil-Template an und zeigt eine Erfolgsmeldung.
 *
 * @param payload - Code, Name, Beschreibung, Aktiv-Flag und Inhalt.
 * @returns Angelegtes Template.
 */
export async function createProfileTemplate(
  payload: Pick<BackendProfileTemplate, 'code' | 'name' | 'description' | 'active' | 'template'>,
): Promise<BackendProfileTemplate> {
  const response = await FetchRetry<typeof payload, BackendProfileTemplate>('profile-templates', payload, 'POST');
  const created = unwrapResponse<BackendProfileTemplate>(response);
  createSnackBar({ message: `Template ${created.code} erstellt`, status: 'success', timeout: 2000 });
  return created;
}

/**
 * Aktualisiert ein Profil-Template teilweise und zeigt eine Erfolgsmeldung.
 *
 * @param id - Id des Templates.
 * @param payload - Zu ändernde Felder.
 * @returns Aktualisiertes Template.
 */
export async function updateProfileTemplate(
  id: string,
  payload: Partial<Pick<BackendProfileTemplate, 'code' | 'name' | 'description' | 'active' | 'template'>>,
): Promise<BackendProfileTemplate> {
  const response = await FetchRetry<typeof payload, BackendProfileTemplate>(`profile-templates/${id}`, payload, 'PUT');
  const updated = unwrapResponse<BackendProfileTemplate>(response);
  createSnackBar({ message: `Template ${updated.code} aktualisiert`, status: 'success', timeout: 2000 });
  return updated;
}

/**
 * Löscht ein Profil-Template und zeigt eine Erfolgsmeldung.
 *
 * @param id - Id des Templates.
 */
export async function deleteProfileTemplate(id: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`profile-templates/${id}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Template gelöscht', status: 'success', timeout: 2000 });
}

// ─── Massenänderung (super-admin) ─────────────────────────

/** `Pers` fehlt bewusst — Identitätsfelder werden nie über mehrere Benutzer kopiert. */
export type BulkApplyCategory = 'Fahrzeit' | 'Arbeitszeit' | 'VorgabenB' | 'Einstellungen';

export type BulkOeTargetField = 'pers' | 'teamOes' | 'organizationOes';

export type BulkUserProfileUpdatePayload = {
  userIds: string[];
  dryRun?: boolean;
  /** 0-basiert, positionsgebunden; `null` = Ebene bleibt unangetastet. */
  oeLevels?: (string | null)[];
  /** Bestimmt, worauf `oeLevels` angewendet wird — Pers.OE und/oder jeder Eintrag der Admin-OE-Listen. */
  oeLevelsApplyTo?: BulkOeTargetField[];
  betrieb?: string;
  gewerk?: string;
  ersteTkgSt?: string;
  ersteTkgStAdresse?: string;
  teamOes?: { add?: string; remove?: string };
  organizationOes?: { add?: string; remove?: string };
  applyFrom?:
    | { type: 'template'; templateId: string; categories: BulkApplyCategory[] }
    | { type: 'user'; sourceUserId: string; categories: BulkApplyCategory[] };
};

export type BulkApplyFieldDiff = { before: string; after: string };

export type BulkApplyEntry = {
  userId: string;
  userName: string;
  oe: BulkApplyFieldDiff & { applicable: boolean };
  betrieb: BulkApplyFieldDiff;
  gewerk: BulkApplyFieldDiff;
  ersteTkgSt: BulkApplyFieldDiff;
  ersteTkgStAdresse: BulkApplyFieldDiff;
  teamOes: BulkApplyFieldDiff;
  organizationOes: BulkApplyFieldDiff;
  categoriesApplied: BulkApplyCategory[];
  status: 'ok' | 'skipped' | 'error';
  message?: string;
};

export type BulkApplyResult = {
  results: BulkApplyEntry[];
  summary: { total: number; ok: number; skipped: number; errors: number };
};

/**
 * Wendet eine Massenänderung auf mehrere Benutzerprofile an; mit `dryRun` nur als Vorschau.
 *
 * @param payload - Betroffene Benutzer, Änderungen und Optionen.
 * @returns Ergebnis je Benutzer samt Summen.
 */
export async function bulkUpdateUserProfiles(payload: BulkUserProfileUpdatePayload): Promise<BulkApplyResult> {
  const response = await FetchRetry<BulkUserProfileUpdatePayload, BulkApplyResult>(
    'admin/user-profiles/bulk-update',
    payload,
    'POST',
  );
  return unwrapResponse<BulkApplyResult>(response);
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
    entgeltausgleich: number;
  };
  adminActivity: { logsLast7d: number };
  auth: { newUsersLast7d: number; emailVerified: number; passkeyUsers: number };
  growth: {
    bereitschaftseinsaetzeLast7d: number;
    bereitschaftszaetraumeLast7d: number;
    ewtLast7d: number;
    nebengeldLast7d: number;
    entgeltausgleichLast7d: number;
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

/**
 * Lädt die Kennzahlen für das Admin-Dashboard.
 *
 * @returns Statistiken.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await FetchRetry<undefined, AdminStats>('admin/stats', undefined, 'GET');
  return unwrapResponse<AdminStats>(response);
}

/**
 * Lädt eine Seite einer Ressource über die Admin-API.
 *
 * @param endpoint - Ressourcen-Endpunkt.
 * @param params - Optional Seite, Limit und Filter (Benutzer, Jahr, Monat).
 * @returns Seite mit Dokumenten und Gesamtzahl.
 */
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

/**
 * Überschreibt ein Ressourcen-Dokument über die Admin-API und zeigt eine Erfolgsmeldung.
 *
 * @param endpoint - Ressourcen-Endpunkt.
 * @param id - Id des Dokuments.
 * @param data - Neue Feldwerte.
 * @returns Gespeichertes Dokument.
 */
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

/**
 * Löscht ein Ressourcen-Dokument über die Admin-API und zeigt eine Erfolgsmeldung.
 *
 * @param endpoint - Ressourcen-Endpunkt.
 * @param id - Id des Dokuments.
 */
export async function deleteAdminDoc(endpoint: string, id: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(`admin/${endpoint}/${id}`, undefined, 'DELETE');
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Gelöscht', status: 'success', timeout: 2000 });
}

/**
 * Lädt eine Seite der UserProfile-Dokumente über die Admin-API.
 *
 * @param params - Optional Seite, Limit und Benutzer-Id.
 * @returns Seite mit Profilen und Gesamtzahl.
 */
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

/**
 * Überschreibt ein UserProfile-Dokument über die Admin-API und zeigt eine Erfolgsmeldung.
 *
 * @param id - Id des Profils.
 * @param data - Neue Feldwerte.
 * @returns Gespeichertes Profil.
 */
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

/**
 * Setzt das Flag `emailVerified` eines Benutzers und zeigt eine Erfolgsmeldung.
 *
 * @param userId - Id des Benutzers.
 * @param emailVerified - Neuer Wert.
 */
export async function setAdminEmailVerified(userId: string, emailVerified: boolean): Promise<void> {
  const response = await FetchRetry<{ emailVerified: boolean }, unknown>(
    `admin/users/${userId}/email-verified`,
    { emailVerified },
    'PATCH',
  );
  unwrapResponse<unknown>(response);
  createSnackBar({ message: `emailVerified → ${emailVerified}`, status: 'success', timeout: 2000 });
}

/**
 * Lädt die Passkeys eines Benutzers.
 *
 * @param userId - Id des Benutzers.
 * @returns Passkeys.
 */
export async function fetchAdminPasskeys(userId: string): Promise<AdminPasskey[]> {
  const response = await FetchRetry<undefined, AdminPasskey[]>(`admin/users/${userId}/passkeys`, undefined, 'GET');
  return unwrapResponse<AdminPasskey[]>(response);
}

/**
 * Löscht einen Passkey eines Benutzers und zeigt eine Erfolgsmeldung.
 *
 * @param userId - Id des Benutzers.
 * @param credentialId - Credential-Id des Passkeys.
 */
export async function deleteAdminPasskey(userId: string, credentialId: string): Promise<void> {
  const response = await FetchRetry<undefined, unknown>(
    `admin/users/${userId}/passkeys/${credentialId}`,
    undefined,
    'DELETE',
  );
  unwrapResponse<unknown>(response);
  createSnackBar({ message: 'Passkey gelöscht', status: 'success', timeout: 2000 });
}

/**
 * Baut eine Map userId→Name aus UserProfile-Dokumenten (max. 200 Profile).
 *
 * @returns Map von Benutzer-Id auf `Vorname Nachname`; ohne Namen die gekürzte Id.
 */
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

/**
 * Lädt die vorhandenen Jahre einer Ressource.
 *
 * @param endpoint - Ressourcen-Endpunkt.
 * @returns Jahre (distinct `Jahr`).
 */
export async function fetchAdminResourceYears(endpoint: string): Promise<number[]> {
  const response = await FetchRetry<undefined, number[]>(`admin/${endpoint}?distinctJahr=1`, undefined, 'GET');
  return unwrapResponse<number[]>(response);
}

/**
 * Lädt den Status `emailVerified` eines Benutzers.
 *
 * @param userId - Id des Benutzers.
 * @returns Objekt mit `emailVerified`.
 */
export async function fetchAdminUserEmailVerified(userId: string): Promise<{ emailVerified: boolean }> {
  const response = await FetchRetry<undefined, { emailVerified: boolean }>(`admin/users/${userId}`, undefined, 'GET');
  return unwrapResponse<{ emailVerified: boolean }>(response);
}

/**
 * Lädt ein einzelnes Ressourcen-Dokument über die Admin-API.
 *
 * @param endpoint - Ressourcen-Endpunkt.
 * @param id - Id des Dokuments.
 * @returns Dokument.
 */
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

/**
 * Lädt aktuelle Heap-Werte und den Verlauf.
 *
 * @param days - Zeitraum in Tagen.
 * @returns Aktueller Stand und Messpunkte.
 */
export async function fetchAdminHeap(days = 7): Promise<HeapData> {
  const response = await FetchRetry<undefined, HeapData>(`admin/heap?days=${days}`, undefined, 'GET');
  return unwrapResponse<HeapData>(response);
}

/**
 * Löst im Backend einen manuellen Heap-Snapshot aus.
 *
 * @returns Der gespeicherte Messpunkt.
 */
export async function triggerAdminHeapSnapshot(): Promise<MetricPoint> {
  const response = await FetchRetry<undefined, MetricPoint>('admin/heap', undefined, 'POST');
  return unwrapResponse<MetricPoint>(response);
}

/**
 * Lädt eine Seite der Admin-Logs.
 *
 * @param params - Optional Seite, Limit und Filter (Admin, Aktion, Zeitraum `from`/`to`).
 * @returns Seite mit Logeinträgen.
 */
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
