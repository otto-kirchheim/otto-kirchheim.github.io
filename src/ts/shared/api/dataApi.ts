import type { IVorgabenGeld, IVorgabenU } from '@/types';
import { type ResourceKind, resourceDefs } from '@/shared/lib/ressource/resourceConfig';
import {
  type BackendUserProfile,
  type BackendVorgabe,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
} from '@/shared/lib/ressource/fieldMapper';
import { apiFetch } from './apiFetchHelper';

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

// ─── Alle Daten eines Jahres laden ────────────────────────

/** Server-Zeitstempel (`updatedAt`) je Storage-Key: `VorgabenU` sowie `dataBZ`, `dataE` usw. der angemeldeten Features. */
export interface SyncTimestamps {
  VorgabenU: string | null;
  [storageKey: string]: string | null;
}

/** Jahresdaten: Profil, Geldvorgaben, Zeitstempel und je Ressource der angemeldeten Features (`BZ`, `BE`, ...) die Zeilen. */
export type LoadedYearData = {
  vorgabenU: IVorgabenU;
  datenGeld: IVorgabenGeld;
  timestamps: SyncTimestamps;
} & Partial<Record<ResourceKind, unknown[]>>;

/**
 * Lädt Profil, Vorgaben und alle Ressourcen der angemeldeten Features eines Jahres parallel.
 *
 * @param year - Jahr.
 * @returns Alle Daten und die `updatedAt`-Zeitstempel je Ressource.
 */
export async function loadAllYearData(year: number): Promise<LoadedYearData> {
  const resources = resourceDefs();
  const [profileResult, datenGeld, ...resourceResults] = await Promise.all([
    profileApi.getMyProfile(),
    vorgabenApi.getByYear(year),
    ...resources.map(resource => resource.api.loadYear(year)),
  ]);

  const timestamps: SyncTimestamps = { VorgabenU: profileResult.updatedAt };
  const rows: Partial<Record<ResourceKind, unknown[]>> = {};
  resources.forEach((resource, index) => {
    rows[resource.key] = resourceResults[index].data;
    timestamps[resource.storageKey] = resourceResults[index].updatedAt;
  });

  return { vorgabenU: profileResult.data, datenGeld, ...rows, timestamps };
}
