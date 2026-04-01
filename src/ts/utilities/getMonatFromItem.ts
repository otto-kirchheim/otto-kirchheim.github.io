import type { Dayjs } from 'dayjs';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../interfaces';
import dayjs from './configDayjs';
import Storage from './Storage';

function toMonat(value: string | Dayjs): number {
  return dayjs(value).month() + 1;
}

export function getMonatFromBZ(item: IDatenBZ): number {
  return toMonat(item.beginB as string | Dayjs);
}

export function getMonatFromBE(item: IDatenBE): number {
  return dayjs(item.tagBE, 'DD.MM.YYYY').month() + 1;
}

export function getMonatFromEWT(item: IDatenEWT): number {
  return dayjs(item.tagE).month() + 1;
}

export function getMonatFromN(item: IDatenN): number {
  const parsedDate = dayjs(item.tagN, 'DD.MM.YYYY', true);
  if (parsedDate.isValid()) return parsedDate.month() + 1;

  if (/^\d{1,2}$/.test(item.tagN)) {
    return Storage.get<number>('Monat', { default: new Date().getMonth() + 1 });
  }

  return dayjs(item.tagN).month() + 1;
}

export function filterByMonat<T>(items: T[], monat: number, getMonat: (item: T) => number): T[] {
  return items.filter(item => getMonat(item) === monat);
}
