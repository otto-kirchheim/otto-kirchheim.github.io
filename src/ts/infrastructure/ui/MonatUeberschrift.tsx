import { useSyncExternalStore } from 'react';
import { DBHeadingH4 } from '@db-ux/react-core-components';
import dayjs from '@/shared/lib/date/configDayjs';
import { getMonatJahr, subscribeMonatJahr } from './monatJahrStore';

/**
 * Ueberschrift mit gewaehltem Monat/Jahr, gespeist aus `monatJahrStore` (gesetzt von `setMonatJahr.ts`). Jeder Tab
 * rendert sie selbst und bleibt damit auch nach einem Unmount/Mount aktuell.
 *
 * @param props - `id`: Element-Id (Vertrag mit Tests/Hilfe, z. B. `MonatB`); `art`: `monat` (`03 / 26`) oder `jahr` (`2026`).
 */
export default function MonatUeberschrift({ id, art = 'monat' }: { id: string; art?: 'monat' | 'jahr' }) {
  const stand = useSyncExternalStore(subscribeMonatJahr, getMonatJahr);
  const text =
    stand === null
      ? ''
      : art === 'jahr'
        ? stand.jahr.toString()
        : dayjs([+stand.jahr, stand.monat - 1]).format('MM / YY');

  return (
    <DBHeadingH4 paragraphSpacing id={id}>
      {text}
    </DBHeadingH4>
  );
}
