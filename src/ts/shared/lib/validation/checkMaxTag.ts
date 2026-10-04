import dayjs from '../date/configDayjs';

/**
 * Liefert den heutigen Tag des Monats, sofern er im Zielmonat existiert (sonst 1, z. B. 31. -> Februar).
 * Dayjs rollt den ungueltigen Tag in den Folgemonat, daran erkennt der Vergleich den Ueberlauf.
 *
 * @param Jahr - Zieljahr.
 * @param Monat - Zielmonat, 0-basiert wie `dayjs().month()`.
 * @returns Heutiger Tag des Monats (1-31) oder 1.
 */
export default function checkMaxTag(Jahr: number, Monat: number): number {
  const tag = dayjs().date();
  return dayjs([Jahr, Monat, tag]).month() === Monat ? tag : 1;
}
