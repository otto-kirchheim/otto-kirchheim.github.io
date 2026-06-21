import dayjs from '@/infrastructure/date/configDayjs';

export const B_WECHSEL_STUNDE = 8;
export const B_WECHSEL_MINUTE = 0;
export const B_WECHSEL_ZEIT = dayjs().hour(B_WECHSEL_STUNDE).minute(B_WECHSEL_MINUTE).format('HH:mm');
