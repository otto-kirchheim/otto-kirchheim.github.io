import dayjs from './configDayjs';
import Storage from '../storage/Storage';

export function getStoredMonatJahr(): { monat: number; jahr: number } {
  return {
    monat: Storage.get<number>('Monat', { default: dayjs().month() + 1 }),
    jahr: Storage.get<number>('Jahr', { default: dayjs().year() }),
  };
}
