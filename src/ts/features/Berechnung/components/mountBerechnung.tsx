import { mount } from '@/infrastructure/ui';

import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import type { IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import type { IZulagenBreakdown } from '../calculateZulagenBreakdown';
import BerechnungMobileCards from './BerechnungMobileCards';
import BerechnungTableRows from './BerechnungTableRows';

/**
 * Rendert die Monatskarten der mobilen Ansicht in `#berechnungMobileCards`; der aktuelle Monat (Storage `Monat`) ist aufgeklappt.
 * Ohne den Container passiert nichts.
 *
 * @param monatsErgebnisse - Berechnungsergebnisse je Monat.
 * @param aktivierteTabs - Aktivierte Feature-Tabs des Benutzers; steuert die sichtbaren Gruppen.
 * @param zulagenBreakdown - Aufschlüsselung der Zulagen je Code.
 */
export function mountBerechnungMobileCards(
  monatsErgebnisse: IBerechnungMonatsErgebnis[],
  aktivierteTabs?: string[],
  zulagenBreakdown?: IZulagenBreakdown,
): void {
  const container = document.querySelector<HTMLDivElement>('#berechnungMobileCards');
  if (!container) return;

  const aktuellerMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });

  mount(
    container,
    <BerechnungMobileCards
      monatsErgebnisse={monatsErgebnisse}
      aktivierteTabs={aktivierteTabs}
      zulagenBreakdown={zulagenBreakdown}
      offenerMonat={aktuellerMonat}
    />,
  );
}

/**
 * Rendert die Zeilen der Desktop-Tabelle als eigenen React-Root direkt in `#tbodyBerechnung`; ohne den Container passiert nichts.
 *
 * @param monatsErgebnisse - Berechnungsergebnisse je Monat.
 * @param zulagenBreakdown - Aufschlüsselung der Zulagen je Code.
 * @param aktivierteTabs - Aktivierte Feature-Tabs des Benutzers; steuert die sichtbaren Gruppen.
 */
export function mountBerechnungTableRows(
  monatsErgebnisse: IBerechnungMonatsErgebnis[],
  zulagenBreakdown: IZulagenBreakdown,
  aktivierteTabs?: string[],
): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
  if (!tbody) return;

  mount(
    tbody,
    <BerechnungTableRows
      monatsErgebnisse={monatsErgebnisse}
      aktivierteTabs={aktivierteTabs}
      zulagenBreakdown={zulagenBreakdown}
    />,
  );
}
