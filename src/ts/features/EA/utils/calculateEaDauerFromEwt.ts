import type { IDatenEWT } from '@/types';
import dayjs from '@/infrastructure/date/configDayjs';

/**
 * Berechnet die Dauer eines EA-Eintrags (geleistete höherwertige Arbeit) aus den Arbeitszeiten
 * (`beginE`/`endeE`) eines verknüpften EWT-Eintrags, abzüglich der gesetzlichen Ruhepause nach
 * §4 ArbZG: ab 6h Arbeitszeit 30 Minuten Pause, ab 9h 45 Minuten (die 45 ersetzen die 30, sie
 * addieren sich nicht). Bewusst unabhängig von den persönlichen Arbeitszeit-/Schicht-Pause-
 * Einstellungen des Nutzers — reine Funktion der rohen Arbeitsdauer, kein Nutzer-Setting.
 */
export default function calculateEaDauerFromEwt(entry: Pick<IDatenEWT, 'beginE' | 'endeE'>): string {
  const beginn = dayjs(entry.beginE, 'HH:mm');
  let ende = dayjs(entry.endeE, 'HH:mm');
  if (ende.isSameOrBefore(beginn)) ende = ende.add(1, 'day');

  const rohMinuten = ende.diff(beginn, 'minute');
  const pause = rohMinuten >= 540 ? 45 : rohMinuten >= 360 ? 30 : 0;
  const dauerMinuten = Math.max(0, rohMinuten - pause);

  const stunden = Math.floor(dauerMinuten / 60);
  const minuten = dauerMinuten % 60;
  return `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}`;
}
