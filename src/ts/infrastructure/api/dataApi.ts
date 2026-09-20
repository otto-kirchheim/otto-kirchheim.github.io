import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN, IVorgabenGeld, IVorgabenU } from '@/types';
import {
  type BackendBereitschaftseinsatz,
  type BackendBereitschaftszeitraum,
  type BackendEA,
  type BackendEWT,
  type BackendNebengeld,
  type BackendUserProfile,
  type BackendVorgabe,
  beFromBackend,
  beToBackend,
  bzFromBackend,
  bzToBackend,
  eaFromBackend,
  eaToBackend,
  ewtFromBackend,
  ewtToBackend,
  nebengeldFromBackend,
  nebengeldToBackend,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
} from '../data/fieldMapper';
import { type BulkRequest, type BulkResponse, apiFetch, loadResourceYear, smartSync } from './apiFetchHelper';

// ─── Profile ─────────────────────────────────────────────

export const profileApi = {
  /**
   * Lädt das eigene Profil (persönliche Vorgaben).
   *
   * @returns Profil und dessen `updatedAt` (`null` ohne Zeitstempel).
   */
  async getMyProfile(): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const doc = await apiFetch<undefined, BackendUserProfile>('user-profiles/me');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },

  /**
   * Speichert das eigene Profil.
   *
   * @param data - Neue persönliche Vorgaben.
   * @returns Gespeichertes Profil und dessen `updatedAt`.
   */
  async updateMyProfile(data: IVorgabenU): Promise<{ data: IVorgabenU; updatedAt: string | null }> {
    const backendData = userProfileToBackend(data);
    const doc = await apiFetch<typeof backendData, BackendUserProfile>('user-profiles/me', backendData, 'PUT');
    return { data: userProfileFromBackend(doc), updatedAt: doc.updatedAt ?? null };
  },
};

// ─── Vorgaben ────────────────────────────────────────────

export const vorgabenApi = {
  /**
   * Lädt die Vorgaben (Geldbeträge) eines Jahres.
   *
   * @param year - Jahr.
   * @returns Vorgaben des Jahres.
   */
  async getByYear(year: number): Promise<IVorgabenGeld> {
    const doc = await apiFetch<undefined, BackendVorgabe>(`vorgaben/${year}`);
    return vorgabenFromBackend(doc) as unknown as IVorgabenGeld;
  },
};

// ─── Bereitschaftszeitraum ───────────────────────────────

export const bereitschaftszeitraumApi = {
  /**
   * Lädt alle Bereitschaftszeiträume eines Jahres.
   *
   * @param year - Jahr.
   * @returns Zeilen und der jüngste `updatedAt` (`null` ohne Zeitstempel).
   */
  async loadYear(year: number): Promise<{ data: IDatenBZ[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftszeitraum, IDatenBZ>(
      'bereitschaftszeitraum',
      year,
      bzFromBackend,
    );
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  /**
   * Sendet neue, geänderte und gelöschte Bereitschaftszeiträume gebündelt; neue Zeilen verlieren ihre `_id` und behalten die `clientRequestId`.
   *
   * @param items - Zu sendende Zeilen (`create` mit `clientRequestId`, `update`) und zu löschende `_id`s.
   * @param monat - Monat (1-12), der beim Mapping ins Backend-Format ergänzt wird.
   * @param jahr - Jahr, das beim Mapping ins Backend-Format ergänzt wird.
   * @returns Bulk-Antwort mit angelegten, geänderten und gelöschten Einträgen sowie Fehlern.
   */
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
  /**
   * Lädt alle Bereitschaftseinsätze eines Jahres.
   *
   * @param year - Jahr.
   * @returns Zeilen und der jüngste `updatedAt` (`null` ohne Zeitstempel).
   */
  async loadYear(year: number): Promise<{ data: IDatenBE[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendBereitschaftseinsatz, IDatenBE>(
      'bereitschaftseinsatz',
      year,
      beFromBackend,
    );
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  /**
   * Sendet neue, geänderte und gelöschte Bereitschaftseinsätze gebündelt; neue Zeilen verlieren ihre `_id` und behalten die `clientRequestId`.
   *
   * @param items - Zu sendende Zeilen (`create` mit `clientRequestId`, `update`) und zu löschende `_id`s.
   * @param monat - Monat (1-12), der beim Mapping ins Backend-Format ergänzt wird.
   * @param jahr - Jahr, das beim Mapping ins Backend-Format ergänzt wird.
   * @returns Bulk-Antwort mit angelegten, geänderten und gelöschten Einträgen sowie Fehlern.
   */
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
  /**
   * Lädt alle EWT-Zeilen eines Jahres.
   *
   * @param year - Jahr.
   * @returns Zeilen und der jüngste `updatedAt` (`null` ohne Zeitstempel).
   */
  async loadYear(year: number): Promise<{ data: IDatenEWT[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendEWT, IDatenEWT>('einsatzwechseltaetigkeit', year, ewtFromBackend);
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  /**
   * Sendet neue, geänderte und gelöschte EWT-Zeilen gebündelt; neue Zeilen verlieren ihre `_id` und behalten die `clientRequestId`.
   *
   * @param items - Zu sendende Zeilen (`create` mit `clientRequestId`, `update`) und zu löschende `_id`s.
   * @param monat - Monat (1-12), der beim Mapping ins Backend-Format ergänzt wird.
   * @param jahr - Jahr, das beim Mapping ins Backend-Format ergänzt wird.
   * @returns Bulk-Antwort mit angelegten, geänderten und gelöschten Einträgen sowie Fehlern.
   */
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
  /**
   * Lädt alle Neben-Zeilen eines Jahres.
   *
   * @param year - Jahr.
   * @returns Zeilen und der jüngste `updatedAt` (`null` ohne Zeitstempel).
   */
  async loadYear(year: number): Promise<{ data: IDatenN[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendNebengeld, IDatenN>('nebengeld', year, nebengeldFromBackend);
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  /**
   * Sendet neue, geänderte und gelöschte Neben-Zeilen gebündelt; neue Zeilen verlieren ihre `_id` und behalten die `clientRequestId`.
   *
   * @param items - Zu sendende Zeilen (`create` mit `clientRequestId`, `update`) und zu löschende `_id`s.
   * @param monat - Monat (1-12), der beim Mapping ins Backend-Format ergänzt wird.
   * @param jahr - Jahr, das beim Mapping ins Backend-Format ergänzt wird.
   * @returns Bulk-Antwort mit angelegten, geänderten und gelöschten Einträgen sowie Fehlern.
   */
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

// ─── Entgeltausgleich ────────────────────────────────────

export const eaApi = {
  /**
   * Lädt alle EA-Zeilen eines Jahres.
   *
   * @param year - Jahr.
   * @returns Zeilen und der jüngste `updatedAt` (`null` ohne Zeitstempel).
   */
  async loadYear(year: number): Promise<{ data: IDatenEA[]; updatedAt: string | null }> {
    const result = await loadResourceYear<BackendEA, IDatenEA>('ea', year, eaFromBackend);
    return { data: result.data, updatedAt: result.maxUpdatedAt };
  },

  /**
   * Sendet neue, geänderte und gelöschte EA-Zeilen gebündelt; neue Zeilen verlieren ihre `_id` und behalten die `clientRequestId`.
   *
   * @param items - Zu sendende Zeilen (`create` mit `clientRequestId`, `update`) und zu löschende `_id`s.
   * @param monat - Monat (1-12), der beim Mapping ins Backend-Format ergänzt wird.
   * @param jahr - Jahr, das beim Mapping ins Backend-Format ergänzt wird.
   * @returns Bulk-Antwort mit angelegten, geänderten und gelöschten Einträgen sowie Fehlern.
   */
  async bulk(
    items: { create: (IDatenEA & { clientRequestId: string })[]; update: IDatenEA[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<BackendEA>> {
    const bulk: BulkRequest = {
      create: items.create.map(item => {
        const data = eaToBackend(item, monat, jahr);
        delete (data as Record<string, unknown>)._id;
        return { ...data, clientRequestId: item.clientRequestId };
      }),
      update: items.update.map(item => ({ ...eaToBackend(item, monat, jahr), _id: item._id! })),
      delete: items.delete,
    };
    return smartSync('ea', bulk);
  },
};

// ─── Alle Daten eines Jahres laden ────────────────────────

export interface SyncTimestamps {
  VorgabenU: string | null;
  dataBZ: string | null;
  dataBE: string | null;
  dataE: string | null;
  dataN: string | null;
  dataEA: string | null;
}

export interface LoadedYearData {
  vorgabenU: IVorgabenU;
  datenGeld: IVorgabenGeld;
  BZ: IDatenBZ[];
  BE: IDatenBE[];
  EWT: IDatenEWT[];
  N: IDatenN[];
  EA: IDatenEA[];
  timestamps: SyncTimestamps;
}

/**
 * Lädt Profil, Vorgaben und alle Ressourcen eines Jahres parallel.
 *
 * @param year - Jahr.
 * @returns Alle Daten und die `updatedAt`-Zeitstempel je Ressource.
 */
export async function loadAllYearData(year: number): Promise<LoadedYearData> {
  const [profileResult, datenGeld, bzResult, beResult, ewtResult, nResult, eaResult] = await Promise.all([
    profileApi.getMyProfile(),
    vorgabenApi.getByYear(year),
    bereitschaftszeitraumApi.loadYear(year),
    bereitschaftseinsatzApi.loadYear(year),
    ewtApi.loadYear(year),
    nebengeldApi.loadYear(year),
    eaApi.loadYear(year),
  ]);

  return {
    vorgabenU: profileResult.data,
    datenGeld,
    BZ: bzResult.data,
    BE: beResult.data,
    EWT: ewtResult.data,
    N: nResult.data,
    EA: eaResult.data,
    timestamps: {
      VorgabenU: profileResult.updatedAt,
      dataBZ: bzResult.updatedAt,
      dataBE: beResult.updatedAt,
      dataE: ewtResult.updatedAt,
      dataN: nResult.updatedAt,
      dataEA: eaResult.updatedAt,
    },
  };
}
