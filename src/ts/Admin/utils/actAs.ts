import { Storage } from '../../utilities';
import dayjs from '../../utilities/configDayjs';
import { loadUserDaten } from '../../Login/utils';
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

  const jahr = Storage.get<number>('Jahr', { default: dayjs().year() });
  const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });

  await loadUserDaten(monat, jahr);
  window.location.hash = '#start';
}

export async function loadOwnUserData(): Promise<void> {
  await loadUserDataForAdminSelection(null);
}
