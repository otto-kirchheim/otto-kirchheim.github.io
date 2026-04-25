import Storage from '@/infrastructure/storage/Storage';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { loadUserDaten } from '@/core/orchestration/auth/utils';
import { setActAsUser } from './api';

export function clearLoadedUserResourceCache(): void {
  Storage.remove('VorgabenU');
  Storage.remove('dataBZ');
  Storage.remove('dataBE');
  Storage.remove('dataE');
  Storage.remove('dataN');
  Storage.remove('datenBerechnung');
  Storage.remove('dataServer');
}

export async function loadUserDataForAdminSelection(userId: string | null, userName?: string): Promise<void> {
  setActAsUser(userId, userName);
  clearLoadedUserResourceCache();

  const { monat, jahr } = getStoredMonatJahr();

  await loadUserDaten(monat, jahr);
  window.location.hash = '#start';
}

export async function loadOwnUserData(): Promise<void> {
  await loadUserDataForAdminSelection(null);
}
