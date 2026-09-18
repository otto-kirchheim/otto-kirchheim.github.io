import { mount } from '@/infrastructure/ui';

import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import type { IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import type { IZulagenBreakdown } from '../calculateZulagenBreakdown';
import BerechnungMobileCards from './BerechnungMobileCards';
import BerechnungTableRows from './BerechnungTableRows';

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
