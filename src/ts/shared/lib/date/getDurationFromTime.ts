import type { Duration } from 'dayjs/plugin/duration.js';
import dayjs from './configDayjs';

/**
 * Wandelt eine Uhrzeit `HH:mm` in eine Dauer seit 0:00 um.
 *
 * @param value - Uhrzeit als `HH:mm` (oder ein anderer dayjs-Wert, der so gelesen wird).
 * @returns Dauer aus Stunden und Minuten der Uhrzeit.
 */
export default function getDurationFromTime(value: dayjs.ConfigType): Duration {
  const time = dayjs(value, 'HH:mm');
  return dayjs.duration({
    hours: time.hour(),
    minutes: time.minute(),
  });
}
