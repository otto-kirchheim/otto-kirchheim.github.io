/**
 * API-Service: Zentraler Zugriffspunkt für alle Backend-API-Aufrufe.
 *
 * Kapselt die neuen REST-Endpunkte und verwendet FetchRetry für Auth/Retry-Logik.
 * Nutzt fieldMapper für die Konvertierung zwischen Frontend- und Backend-Formaten.
 */

import type {
  IDatenBE,
  IDatenBEJahr,
  IDatenBZ,
  IDatenBZJahr,
  IDatenEWT,
  IDatenEWTJahr,
  IDatenN,
  IDatenNJahr,
  IVorgabenGeld,
  IVorgabenU,
} from '../interfaces';
import { FetchRetry, getServerUrl } from './FetchRetry';
import { abortController } from './abortController';
import {
  type BackendBereitschaftseinsatz,
  type BackendBereitschaftszeitraum,
  type BackendEWT,
  type BackendNebengeld,
  type BackendUserProfile,
  type BackendVorgabe,
  type GroupedByMonat,
  beFromBackend,
  beToBackend,
  bzFromBackend,
  bzToBackend,
  ewtFromBackend,
  ewtToBackend,
  groupByMonat,
  nebengeldFromBackend,
  nebengeldToBackend,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
} from './fieldMapper';

// ─── Typen ───────────────────────────────────────────────

/** Neues Backend-Response-Format */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Bulk-Operation Request */
export interface BulkRequest<TCreate = unknown, TUpdate = unknown> {
  create?: TCreate[];
  update?: (TUpdate & { _id: string })[];
  delete?: string[];
}

/** Bulk-Operation Response */
interface BulkResponse<T = unknown> {
  created: T[];
  updated: T[];
  deleted: string[];
  errors: { operation: string; index: number; id?: string; message: string }[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────

/**
 * Wrapper um FetchRetry, der das neue Backend-Response-Format auswertet.
 * Wirft Error bei !success.
 */
async function apiFetch<I, T>(
  path: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
): Promise<T> {
  const result = await FetchRetry<I, T>(path, data, method);
  if (result instanceof Error) throw result;

  // Neues Format: { success, data, message }
  const response = result as unknown as ApiResponse<T> & { statusCode: number };
  if (!response.success && response.statusCode >= 400) {
    throw new Error(response.message ?? `API-Fehler (${response.statusCode})`);
  }

  return response.data as T;
}

// ─── Auth-Endpunkte ──────────────────────────────────────

export const authApi = {
  /**
   * Login: POST /auth/login
   * Alt: POST /login mit { Name, Passwort }
   * Neu: POST /auth/login mit { userName, password }
   */
  async login(userName: string, password: string): Promise<void> {
    await apiFetch<{ userName: string; password: string }, unknown>('auth/login', { userName, password }, 'POST');
  },

  /**
   * Registrierung: POST /auth/register
   * Alt: POST /add mit { Code, Name, Passwort }
   * Neu: POST /auth/register mit { userName, email, password, accessCode }
   */
  async register(userName: string, email: string, password: string, accessCode: string): Promise<void> {
    await apiFetch<{ userName: string; email: string; password: string; accessCode: string }, unknown>(
      'auth/register',
      { userName, email, password, accessCode },
      'POST',
    );
  },

  /**
   * Token erneuern: POST /auth/refresh-token
   * Alt: POST /refreshToken
   * Neu: POST /auth/refresh-token
   */
  async refreshToken(): Promise<void> {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? 'Token-Refresh fehlgeschlagen');
    }
  },

  /**
   * Passwort ändern: POST /auth/change-password
   * Alt: POST /changePW mit { PasswortAlt, PasswortNeu }
   * Neu: POST /auth/change-password mit { currentPassword, newPassword }
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    await apiFetch<{ currentPassword: string; newPassword: string }, unknown>(
      'auth/change-password',
      { currentPassword, newPassword },
      'POST',
    );
    return true;
  },

  /**
   * Passwort-Reset anfordern: POST /auth/forgot-password
   */
  async forgotPassword(email: string): Promise<void> {
    await apiFetch<{ email: string }, unknown>('auth/forgot-password', { email }, 'POST');
  },

  /**
   * Passwort mit Token zurücksetzen: POST /auth/reset-password/:token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiFetch<{ newPassword: string }, unknown>(
      `auth/reset-password/${encodeURIComponent(token)}`,
      { newPassword },
      'POST',
    );
  },

  /**
   * Verifizierungs-E-Mail erneut senden: POST /auth/resend-verification-email
   */
  async resendVerificationEmail(email?: string): Promise<void> {
    await apiFetch<{ email?: string }, unknown>('auth/resend-verification-email', { email }, 'POST');
  },

  /**
   * Aktueller User: GET /auth/me
   */
  async me(): Promise<{ id: string; userName: string; role: string; email: string; emailVerified?: boolean }> {
    return apiFetch('auth/me');
  },

  /**
   * Logout: POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await apiFetch('auth/logout', undefined, 'POST');
    } catch {
      // Logout-Fehler ignorieren – lokale Daten werden sowieso gelöscht
    }
  },
};

// ─── UserProfile-Endpunkte ───────────────────────────────

export const profileApi = {
  /**
   * Eigenes Profil laden: GET /user-profiles/me
   * Konvertiert Backend-Format → Frontend IVorgabenU
   */
  async getMyProfile(): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const doc = await apiFetch<undefined, BackendUserProfile>('user-profiles/me');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },

  /**
   * Eigenes Profil aktualisieren: PUT /user-profiles/me
   * Konvertiert Frontend IVorgabenU → Backend-Format
   */
  async updateMyProfile(data: IVorgabenU): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const backendData = userProfileToBackend(data);
    const doc = await apiFetch<typeof backendData, BackendUserProfile>('user-profiles/me', backendData, 'PUT');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },
};

// ─── Vorgaben-Endpunkte ──────────────────────────────────

export const vorgabenApi = {
  /**
   * Vorgaben für ein Jahr laden: GET /vorgaben/:year
   * Das Backend liefert ein Vorgaben-Objekt, das in IVorgabenGeld konvertiert wird.
   */
  async getByYear(year: number): Promise<IVorgabenGeld> {
    const doc = await apiFetch<undefined, BackendVorgabe>(`vorgaben/${year}`);
    return vorgabenFromBackend(doc) as unknown as IVorgabenGeld;
  },
};

// ─── Ressourcen-Endpunkte (generisch) ────────────────────

type ResourceName = 'bereitschaftszeitraum' | 'bereitschaftseinsatz' | 'einsatzwechseltaetigkeit' | 'nebengeld';

/**
 * Generische Funktion: Lade alle Einträge eines Jahres für eine Ressource.
 * GET /:resource/:year → Backend liefert flaches Array → gruppiert nach Monat.
 * Gibt Daten + max updatedAt zurück.
 */
async function loadResourceYear<TBackend extends { Monat: number; updatedAt?: string }, TFrontend>(
  resource: ResourceName,
  year: number,
  mapper: (doc: TBackend) => TFrontend,
): Promise<GroupedByMonat<TFrontend>> {
  const docs = await apiFetch<undefined, TBackend[]>(`${resource}/${year}`);
  return groupByMonat(docs, mapper);
}

/**
 * Generische Bulk-Operation für eine Ressource.
 * POST /:resource/bulk mit { create, update, delete }
 */
async function bulkResource<TBackend>(resource: ResourceName, bulk: BulkRequest): Promise<BulkResponse<TBackend>> {
  return apiFetch<BulkRequest, BulkResponse<TBackend>>(`${resource}/bulk`, bulk, 'POST');
}

/**
 * Generische Einzel-Operation: Erstellen.
 * POST /:resource → gibt erstelltes Dokument zurück.
 */
async function createResource<TBackend>(resource: ResourceName, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(resource, data, 'POST');
}

/**
 * Generische Einzel-Operation: Aktualisieren.
 * PUT /:resource/:id → gibt aktualisiertes Dokument zurück.
 */
async function updateResource<TBackend>(resource: ResourceName, id: string, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(`${resource}/${id}`, data, 'PUT');
}

/**
 * Generische Einzel-Operation: Löschen.
 * DELETE /:resource/:id
 */
async function deleteResource(resource: ResourceName, id: string): Promise<void> {
  await apiFetch<undefined, unknown>(`${resource}/${id}`, undefined, 'DELETE');
}

/**
 * Prüft ob nur eine einzige Operation vorliegt und sendet ggf. einen Einzelrequest
 * statt Bulk. Gibt BulkResponse zurück (einheitliches Format für den Aufrufer).
 */
async function smartSync<TBackend>(resource: ResourceName, bulk: BulkRequest): Promise<BulkResponse<TBackend>> {
  const createCount = bulk.create?.length ?? 0;
  const updateCount = bulk.update?.length ?? 0;
  const deleteCount = bulk.delete?.length ?? 0;
  const total = createCount + updateCount + deleteCount;

  // Mehr als 1 Operation → Bulk
  if (total !== 1) {
    return bulkResource<TBackend>(resource, bulk);
  }

  // Genau 1 Create
  if (createCount === 1) {
    const doc = await createResource<TBackend>(resource, bulk.create![0]);
    return { created: [doc], updated: [], deleted: [], errors: [] };
  }

  // Genau 1 Update
  if (updateCount === 1) {
    const { _id, ...fields } = bulk.update![0] as Record<string, unknown> & { _id: string };
    const doc = await updateResource<TBackend>(resource, _id, fields);
    return { created: [], updated: [doc], deleted: [], errors: [] };
  }

  // Genau 1 Delete
  const id = bulk.delete![0];
  await deleteResource(resource, id);
  return { created: [], updated: [], deleted: [id], errors: [] };
}

// ─── Bereitschaftszeitraum ───────────────────────────────

export const bereitschaftszeitraumApi = {
  async loadYear(year: number): Promise<{ data: IDatenBZJahr; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftszeitraum, IDatenBZ>(
      'bereitschaftszeitraum',
      year,
      bzFromBackend,
    );
    return { data: result.data as IDatenBZJahr, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: IDatenBZ[]; update: IDatenBZ[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendBereitschaftszeitraum>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = bzToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return data;
      }),
      update: items.update.map(item => ({
        ...bzToBackend(item, monat, jahr),
        _id: item._id!,
      })),
      delete: items.delete,
    };
    return smartSync('bereitschaftszeitraum', bulk);
  },
};

// ─── Bereitschaftseinsatz ────────────────────────────────

export const bereitschaftseinsatzApi = {
  async loadYear(year: number): Promise<{ data: IDatenBEJahr; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftseinsatz, IDatenBE>(
      'bereitschaftseinsatz',
      year,
      beFromBackend,
    );
    return { data: result.data as IDatenBEJahr, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: IDatenBE[]; update: IDatenBE[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendBereitschaftseinsatz>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = beToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return data;
      }),
      update: items.update.map(item => ({
        ...beToBackend(item, monat, jahr),
        _id: item._id!,
      })),
      delete: items.delete,
    };
    return smartSync('bereitschaftseinsatz', bulk);
  },
};

// ─── Einsatzwechseltätigkeit ─────────────────────────────

export const ewtApi = {
  async loadYear(year: number): Promise<{ data: IDatenEWTJahr; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendEWT, IDatenEWT>('einsatzwechseltaetigkeit', year, ewtFromBackend);
    return { data: result.data as IDatenEWTJahr, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: IDatenEWT[]; update: IDatenEWT[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendEWT>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = ewtToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return data;
      }),
      update: items.update.map(item => ({
        ...ewtToBackend(item, monat, jahr),
        _id: item._id!,
      })),
      delete: items.delete,
    };
    return smartSync('einsatzwechseltaetigkeit', bulk);
  },
};

// ─── Nebengeld ───────────────────────────────────────────

export const nebengeldApi = {
  async loadYear(year: number): Promise<{ data: IDatenNJahr; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendNebengeld, IDatenN>('nebengeld', year, nebengeldFromBackend);
    return { data: result.data as IDatenNJahr, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: IDatenN[]; update: IDatenN[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendNebengeld>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = nebengeldToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return data;
      }),
      update: items.update.map(item => ({
        ...nebengeldToBackend(item, monat, jahr),
        _id: item._id!,
      })),
      delete: items.delete,
    };
    return smartSync('nebengeld', bulk);
  },
};

// ─── Alle Daten eines Jahres laden (ersetzt GET /{year}) ─

/** Sync-Timestamps pro Ressource (ISO-Strings) */
export interface SyncTimestamps {
  VorgabenU: string | null;
  dataBZ: string | null;
  dataBE: string | null;
  dataE: string | null;
  dataN: string | null;
}

export interface LoadedYearData {
  vorgabenU: IVorgabenU;
  datenGeld: IVorgabenGeld;
  BZ: IDatenBZJahr;
  BE: IDatenBEJahr;
  EWT: IDatenEWTJahr;
  N: IDatenNJahr;
  timestamps: SyncTimestamps;
}

/**
 * Lädt alle Daten für ein Jahr parallel.
 * Ersetzt den alten einzelnen GET /{year} Call.
 */
export async function loadAllYearData(year: number): Promise<LoadedYearData> {
  const [profileResult, datenGeld, bzResult, beResult, ewtResult, nResult] = await Promise.all([
    profileApi.getMyProfile(),
    vorgabenApi.getByYear(year),
    bereitschaftszeitraumApi.loadYear(year),
    bereitschaftseinsatzApi.loadYear(year),
    ewtApi.loadYear(year),
    nebengeldApi.loadYear(year),
  ]);

  return {
    vorgabenU: profileResult.data,
    datenGeld,
    BZ: bzResult.data,
    BE: beResult.data,
    EWT: ewtResult.data,
    N: nResult.data,
    timestamps: {
      VorgabenU: profileResult.updatedAt,
      dataBZ: bzResult.updatedAt,
      dataBE: beResult.updatedAt,
      dataE: ewtResult.updatedAt,
      dataN: nResult.updatedAt,
    },
  };
}

// ─── Download (PDF-Export) ───────────────────────────────

/**
 * PDF-Download für eine Ressource.
 * Alt: POST /download/{B|E|N}
 * Neu: POST /{resource}/download
 */
export async function downloadPdf(
  modus: 'B' | 'E' | 'N',
  data: Record<string, unknown>,
): Promise<{ blob: Blob; filename: string }> {
  if (!navigator.onLine) throw new Error('Keine Internetverbindung');

  const endpointMap: Record<string, string> = {
    B: 'bereitschaftszeitraum/download',
    E: 'einsatzwechseltaetigkeit/download',
    N: 'nebengeld/download',
  };

  const endpoint = endpointMap[modus];
  const serverUrl = await getServerUrl();

  const response = await fetch(`${serverUrl}/${endpoint}`, {
    mode: 'cors',
    credentials: 'include',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: JSON.stringify(data),
    cache: 'no-cache',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message ?? `Download-Fehler (${response.status})`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = 'download.pdf';

  if (contentDisposition) {
    const matches = /filename="([^"]+)"/.exec(contentDisposition);
    if (matches?.[1]) filename = matches[1];
  }

  return { blob, filename };
}
