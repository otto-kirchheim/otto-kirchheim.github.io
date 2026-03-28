import type { IDatenEWT } from '../../interfaces';
import dayjs from '../../utilities/configDayjs';

const ZEITFELDER = ['abWE', 'beginE', 'ab1E', 'anEE', 'abEE', 'an1E', 'endeE', 'anWE'] as const;
type Zeitfeld = (typeof ZEITFELDER)[number];

export type TZeitreihenfolgeFehler = {
  feld: Zeitfeld;
  message: string;
};

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

const isWohnungFeld = (feld: Zeitfeld): boolean => feld === 'abWE' || feld === 'anWE';

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
 * @returns Feldbezogene Fehlermeldungen oder null bei korrekter Reihenfolge.
 */
export default function validateZeitenReihenfolge(values: IDatenEWT): TZeitreihenfolgeFehler[] | null {
  const isNacht = ['N', 'BN'].includes(values.schichtE);
  const baseDate = dayjs(values.tagE);

  let dayOffset = isNacht ? -1 : 0;
  let prevMinutes: number | null = null;

  const resolved: Array<{ feld: Zeitfeld; dt: dayjs.Dayjs }> = [];
  const rollovers: Array<{ prev: Zeitfeld; curr: Zeitfeld; prevMinutes: number; currMinutes: number }> = [];
  const resolvedIndexByField = new Map<Zeitfeld, number>();

  for (const feld of ZEITFELDER) {
    const timeStr = values[feld] as string;
    if (!timeStr) continue;

    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const minutes = h * 60 + m;

    // Tageswechsel: Zeitwert liegt strikt vor dem vorherigen → nächster Tag
    if (prevMinutes !== null && minutes < prevMinutes) {
      rollovers.push({
        prev: resolved[resolved.length - 1].feld,
        curr: feld,
        prevMinutes,
        currMinutes: minutes,
      });
      dayOffset++;
    }

    const dt = baseDate.add(dayOffset, 'day').hour(h).minute(m).second(0).millisecond(0);
    resolved.push({ feld, dt });
    resolvedIndexByField.set(feld, resolved.length - 1);
    prevMinutes = minutes;
  }

  if (resolved.length < 2) return null;

  if (rollovers.length > 0) {
    // In N/BN ist genau ein plausibler Mitternachtswechsel erlaubt (abends -> morgens).
    // Beispiel plausibel: 20:50 -> 05:10. Beispiel unplausibel: 19:25 -> 18:45.
    const isPlausiblerMitternachtswechsel = (prev: number, curr: number): boolean => prev >= 12 * 60 && curr <= 12 * 60;

    let erlaubterMitternachtswechselVerbraucht = false;
    const unerwarteteRollovers = rollovers.filter(rollover => {
      if (!isNacht) return true;
      if (erlaubterMitternachtswechselVerbraucht) return true;
      if (!isPlausiblerMitternachtswechsel(rollover.prevMinutes, rollover.currMinutes)) return true;

      erlaubterMitternachtswechselVerbraucht = true;
      return false;
    });

    if (unerwarteteRollovers.length === 0) {
      return null;
    }

    const fehlerNachFeld = new Map<Zeitfeld, TZeitreihenfolgeFehler>();
    const fehlerPrioritaet = new Map<Zeitfeld, number>();

    const setFehler = (feld: Zeitfeld, message: string, prioritaet: number): void => {
      const bestehendePrioritaet = fehlerPrioritaet.get(feld) ?? -1;
      if (prioritaet < bestehendePrioritaet) return;

      fehlerPrioritaet.set(feld, prioritaet);
      fehlerNachFeld.set(feld, { feld, message });
    };

    const getNachbarFelder = (index: number): { prevFeld: Zeitfeld | null; nextFeld: Zeitfeld | null } => ({
      prevFeld: index > 0 ? resolved[index - 1].feld : null,
      nextFeld: index < resolved.length - 1 ? resolved[index + 1].feld : null,
    });

    const getZwischenMessage = (feld: Zeitfeld, prevFallback: Zeitfeld): string => {
      const index = resolvedIndexByField.get(feld);
      if (index === undefined) {
        return `Muss nach "${FELD_LABELS[prevFallback]}" liegen.`;
      }

      const { prevFeld, nextFeld } = getNachbarFelder(index);

      // Wohnung-Felder sind Sequenzränder: dort sind vor/nach-Meldungen klarer.
      if (isWohnungFeld(feld)) {
        if (prevFeld) {
          return `Muss nach "${FELD_LABELS[prevFeld]}" liegen.`;
        }

        if (nextFeld) {
          return `Muss vor "${FELD_LABELS[nextFeld]}" liegen.`;
        }

        return `Muss nach "${FELD_LABELS[prevFallback]}" liegen.`;
      }

      if (prevFeld && nextFeld) {
        return `Muss zwischen "${FELD_LABELS[prevFeld]}" und "${FELD_LABELS[nextFeld]}" liegen.`;
      }

      if (prevFeld) {
        return `Muss nach "${FELD_LABELS[prevFeld]}" liegen.`;
      }

      if (nextFeld) {
        return `Muss vor "${FELD_LABELS[nextFeld]}" liegen.`;
      }

      return `Muss nach "${FELD_LABELS[prevFallback]}" liegen.`;
    };

    const getVorherigesFeldMessage = (prevFeld: Zeitfeld, currFeld: Zeitfeld): string => {
      const prevIndex = resolvedIndexByField.get(prevFeld);
      const currIndex = resolvedIndexByField.get(currFeld);

      if (isWohnungFeld(prevFeld)) {
        return `Muss vor "${FELD_LABELS[currFeld]}" liegen.`;
      }

      if (prevIndex !== undefined && currIndex !== undefined) {
        const { prevFeld: leftBound } = getNachbarFelder(prevIndex);
        const rightBound = currIndex < resolved.length - 1 ? resolved[currIndex + 1].feld : currFeld;

        if (leftBound && rightBound) {
          return `Muss zwischen "${FELD_LABELS[leftBound]}" und "${FELD_LABELS[rightBound]}" liegen.`;
        }
      }

      return `Muss vor "${FELD_LABELS[currFeld]}" liegen.`;
    };

    for (const rollover of unerwarteteRollovers) {
      const prevMessage = getVorherigesFeldMessage(rollover.prev, rollover.curr);
      const currMessage = getZwischenMessage(rollover.curr, rollover.prev);

      setFehler(rollover.prev, prevMessage, prevMessage.includes('zwischen') ? 2 : 1);
      setFehler(rollover.curr, currMessage, currMessage.includes('zwischen') ? 2 : 1);
    }

    return Array.from(fehlerNachFeld.values());
  }

  // Zusätzlicher Guard: ungewöhnlich große Gesamtspanne ohne klaren Rollover-Hinweis.
  // Dieser Fall ist selten, soll aber keine stillen Falsch-Positiven erzeugen.
  const totalMinutes = resolved[resolved.length - 1].dt.diff(resolved[0].dt, 'minute');
  if (totalMinutes > MAX_SPAN_MINUTES) {
    return [
      {
        feld: resolved[resolved.length - 1].feld,
        message: `Muss nach "${FELD_LABELS[resolved[resolved.length - 2].feld]}" liegen.`,
      },
    ];
  }

  return null;
}
