import type { IDatenEWT } from '../../interfaces';
import dayjs from '../../utilities/configDayjs';

const ZEITFELDER = ['abWE', 'beginE', 'ab1E', 'anEE', 'abEE', 'an1E', 'endeE', 'anWE'] as const;
type Zeitfeld = (typeof ZEITFELDER)[number];

const FELD_LABELS: Record<Zeitfeld, string> = {
  abWE: 'Ab Wohnung',
  beginE: 'Arbeitszeit Von',
  ab1E: 'Ab 1.Tgk.-St.',
  anEE: 'An Einsatzort',
  abEE: 'Ab Einsatzort',
  an1E: 'An 1.Tgk.-St.',
  endeE: 'Arbeitszeit Bis',
  anWE: 'An Wohnung',
};

// Maximale Gesamtspanne: 20 Stunden (fängt durch Tagesübertrag verschleierte Reihenfolge-Fehler ab)
const MAX_SPAN_MINUTES = 20 * 60;

/**
 * Prüft, ob die Zeitfelder eines EWT-Eintrags in der vorgeschriebenen Reihenfolge liegen:
 * abWE < beginE < ab1E < anEE < abEE < an1E < endeE < anWE
 *
 * Leere Felder werden übersprungen. Tageswechsel werden berücksichtigt:
 * Bei N- und BN-Schichten startet die Sequenz am Vortag (dayOffset = -1).
 * Fällt ein Zeitwert (HH:mm) kleiner als der vorherige aus, wird automatisch
 * ein Tagesübertrag (+1 Tag) angenommen. Übersteigt die Gesamtspanne 20 Stunden,
 * deutet das auf einen Reihenfolge-Fehler hin.
 *
 * @returns Fehlermeldung auf Deutsch oder null bei korrekter Reihenfolge.
 */
export default function validateZeitenReihenfolge(values: IDatenEWT): string | null {
  const isNacht = ['N', 'BN'].includes(values.schichtE);
  const baseDate = dayjs(values.tagE);

  let dayOffset = isNacht ? -1 : 0;
  let prevMinutes: number | null = null;

  const resolved: Array<{ feld: Zeitfeld; dt: dayjs.Dayjs }> = [];
  const rollovers: Array<{ prev: Zeitfeld; curr: Zeitfeld }> = [];

  for (const feld of ZEITFELDER) {
    const timeStr = values[feld] as string;
    if (!timeStr) continue;

    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const minutes = h * 60 + m;

    // Tageswechsel: Zeitwert liegt strikt vor dem vorherigen → nächster Tag
    if (prevMinutes !== null && minutes < prevMinutes) {
      rollovers.push({ prev: resolved[resolved.length - 1].feld, curr: feld });
      dayOffset++;
    }

    const dt = baseDate.add(dayOffset, 'day').hour(h).minute(m).second(0).millisecond(0);
    resolved.push({ feld, dt });
    prevMinutes = minutes;
  }

  if (resolved.length < 2) return null;

  // Gesamtspanne > 20 h deutet auf verschleierten Reihenfolge-Fehler hin (zu vieler Tagesübertrag).
  // Das letzte Rollover-Paar ist die wahrscheinliche Fehlstelle, da dort die unerwartete
  // zweite Mitternacht überschritten wurde.
  const totalMinutes = resolved[resolved.length - 1].dt.diff(resolved[0].dt, 'minute');
  if (totalMinutes > MAX_SPAN_MINUTES && rollovers.length > 0) {
    const last = rollovers[rollovers.length - 1];
    return `Zeitreihenfolge ungültig: "${FELD_LABELS[last.prev]}" muss vor "${FELD_LABELS[last.curr]}" liegen.`;
  }

  return null;
}
