import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, IVorgabenGeld, IVorgabenU } from '@/types';
import {
  type BackendBereitschaftseinsatz,
  type BackendBereitschaftszeitraum,
  type BackendEWT,
  type BackendNebengeld,
  type BackendUserProfile,
  type BackendVorgabe,
  beFromBackend,
  beToBackend,
  bzFromBackend,
  bzToBackend,
  ewtFromBackend,
  ewtToBackend,
  nebengeldFromBackend,
  nebengeldToBackend,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
} from '../data/fieldMapper';
import Storage from '../storage/Storage';
import { getServerUrl } from './FetchRetry';
import { abortController } from './abortController';
import { type BulkRequest, type BulkResponse, apiFetch, loadResourceYear, smartSync } from './apiFetchHelper';

// ─── Profile ─────────────────────────────────────────────

export const profileApi = {
  async getMyProfile(): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const doc = await apiFetch<undefined, BackendUserProfile>('user-profiles/me');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },

  async updateMyProfile(data: IVorgabenU): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const backendData = userProfileToBackend(data);
    const doc = await apiFetch<typeof backendData, BackendUserProfile>('user-profiles/me', backendData, 'PUT');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },
};

// ─── Vorgaben ────────────────────────────────────────────

export const vorgabenApi = {
  async getByYear(year: number): Promise<IVorgabenGeld> {
    const doc = await apiFetch<undefined, BackendVorgabe>(`vorgaben/${year}`);
    return vorgabenFromBackend(doc) as unknown as IVorgabenGeld;
  },
};

// ─── Bereitschaftszeitraum ───────────────────────────────

export const bereitschaftszeitraumApi = {
  async loadYear(year: number): Promise<{ data: IDatenBZ[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftszeitraum, IDatenBZ>(
      'bereitschaftszeitraum',
      year,
      bzFromBackend,
    );
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: (IDatenBZ & { clientRequestId: string })[]; update: IDatenBZ[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendBereitschaftszeitraum>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = bzToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return { ...data, clientRequestId: item.clientRequestId };
      }),
      update: items.update.map(item => ({ ...bzToBackend(item, monat, jahr), _id: item._id! })),
      delete: items.delete,
    };
    return smartSync('bereitschaftszeitraum', bulk);
  },
};

// ─── Bereitschaftseinsatz ────────────────────────────────

export const bereitschaftseinsatzApi = {
  async loadYear(year: number): Promise<{ data: IDatenBE[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftseinsatz, IDatenBE>(
      'bereitschaftseinsatz',
      year,
      beFromBackend,
    );
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: (IDatenBE & { clientRequestId: string })[]; update: IDatenBE[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendBereitschaftseinsatz>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = beToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return { ...data, clientRequestId: item.clientRequestId };
      }),
      update: items.update.map(item => ({ ...beToBackend(item, monat, jahr), _id: item._id! })),
      delete: items.delete,
    };
    return smartSync('bereitschaftseinsatz', bulk);
  },
};

// ─── EWT ─────────────────────────────────────────────────

export const ewtApi = {
  async loadYear(year: number): Promise<{ data: IDatenEWT[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendEWT, IDatenEWT>('einsatzwechseltaetigkeit', year, ewtFromBackend);
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: (IDatenEWT & { clientRequestId: string })[]; update: IDatenEWT[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendEWT>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = ewtToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return { ...data, clientRequestId: item.clientRequestId };
      }),
      update: items.update.map(item => ({ ...ewtToBackend(item, monat, jahr), _id: item._id! })),
      delete: items.delete,
    };
    return smartSync('einsatzwechseltaetigkeit', bulk);
  },
};

// ─── Nebengeld ───────────────────────────────────────────

export const nebengeldApi = {
  async loadYear(year: number): Promise<{ data: IDatenN[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendNebengeld, IDatenN>('nebengeld', year, nebengeldFromBackend);
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  async bulk(
    items: { create: (IDatenN & { clientRequestId: string })[]; update: IDatenN[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendNebengeld>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = nebengeldToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return { ...data, clientRequestId: item.clientRequestId };
      }),
      update: items.update.map(item => ({ ...nebengeldToBackend(item, monat, jahr), _id: item._id! })),
      delete: items.delete,
    };
    return smartSync('nebengeld', bulk);
  },
};

// ─── Alle Daten eines Jahres laden ────────────────────────

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
  BZ: IDatenBZ[];
  BE: IDatenBE[];
  EWT: IDatenEWT[];
  N: IDatenN[];
  timestamps: SyncTimestamps;
}

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

  const serverUrl = await getServerUrl();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const accessToken = Storage.check('AccessToken') ? Storage.get<string>('AccessToken', true) : null;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${serverUrl}/${endpointMap[modus]}`, {
    mode: 'cors',
    method: 'POST',
    headers,
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
