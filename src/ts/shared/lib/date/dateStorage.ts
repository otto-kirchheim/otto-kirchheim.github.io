import dayjs from './configDayjs';
import Storage from '../storage/Storage';

/**
 * Liest den zuletzt gewählten Monat und das Jahr aus dem Storage.
 *
 * @returns `monat` (1-12) und `jahr`; jeweils der aktuelle Wert, wenn nichts gespeichert ist.
 */
export function getStoredMonatJahr(): { monat: number; jahr: number } {
  return {
    monat: Storage.get<number>('Monat', { default: dayjs().month() + 1 }),
    jahr: Storage.get<number>('Jahr', { default: dayjs().year() }),
  };
}
