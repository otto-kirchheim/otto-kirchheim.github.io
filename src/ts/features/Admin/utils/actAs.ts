import Storage, { type TStorageData } from '@/shared/lib/storage/Storage';
import { getStoredMonatJahr } from '@/shared/lib/date/dateStorage';
import { resourceDefs } from '@/shared/lib/ressource/resourceConfig';
import { loadUserDaten } from '@/core/orchestration/auth/utils';
import { setActAsUser } from './api';

/**
 * Entfernt die im Storage gehaltenen Daten des zuletzt geladenen Benutzers, damit beim Wechsel nichts vom vorherigen Benutzer stehen bleibt.
 */
export function clearLoadedUserResourceCache(): void {
  Storage.remove('VorgabenU');
  for (const resource of resourceDefs()) Storage.remove(resource.storageKey as TStorageData);
  Storage.remove('datenBerechnung');
  Storage.remove('dataServer');
}

/**
 * Wechselt den Act-as-Benutzer, leert den Ressourcen-Cache, lädt dessen Daten für den gespeicherten Monat/Jahr und springt auf `#start`.
 *
 * @param userId - Benutzer, in dessen Namen gearbeitet wird; `null` = eigener Account.
 * @param userName - Anzeigename des Benutzers für die Act-as-Anzeige.
 */
export async function loadUserDataForAdminSelection(userId: string | null, userName?: string): Promise<void> {
  setActAsUser(userId, userName);
  clearLoadedUserResourceCache();

  const { monat, jahr } = getStoredMonatJahr();

  await loadUserDaten(monat, jahr);
  window.location.hash = '#start';
}

/**
 * Beendet Act-as und lädt wieder die eigenen Daten.
 */
export async function loadOwnUserData(): Promise<void> {
  await loadUserDataForAdminSelection(null);
}
