import type { Dayjs } from 'dayjs';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, TEwtFilter } from '../../core/types';
import dayjs from './configDayjs';
import Storage from '../storage/Storage';

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

export function getMonatFromEWTBuchungstag(item: IDatenEWT): number {
  const basis = item.buchungstagE || item.tagE;
  return dayjs(basis).month() + 1;
}

export function isEwtInMonat(item: IDatenEWT, monat: number, mode: TEwtFilter = 'beide'): boolean {
  if (mode === 'starttag') return getMonatFromEWT(item) === monat;
  if (mode === 'buchungstag') return getMonatFromEWTBuchungstag(item) === monat;
  return getMonatFromEWT(item) === monat || getMonatFromEWTBuchungstag(item) === monat;
}

export function getMonatFromN(item: IDatenN): number {
  const parsedDate = dayjs(item.tagN, 'DD.MM.YYYY', true);
  if (parsedDate.isValid()) return parsedDate.month() + 1;

  if (/^\d{1,2}$/.test(item.tagN)) {
    return Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  }

  return dayjs(item.tagN).month() + 1;
}

export function filterByMonat<T>(items: T[], monat: number, getMonat: (item: T) => number): T[] {
  return items.filter(item => getMonat(item) === monat);
}
