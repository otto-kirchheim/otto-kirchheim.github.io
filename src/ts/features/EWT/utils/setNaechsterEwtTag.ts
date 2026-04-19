import { createSnackBar } from '../../../class/CustomSnackbar';
import type { IMonatsDaten } from '../../../interfaces';
import { default as Storage } from '../../../infrastructure/storage/Storage';
import dayjs from '../../../infrastructure/date/configDayjs';
import getEwtDaten from './getEwtDaten';

export default function setNaechsterEwtTag(
  tag?: string | number | null,
  dataE: IMonatsDaten['EWT'] = getEwtDaten(undefined, undefined, { scope: 'monat' }),
): void {
  const eingabefeldTagE = document.querySelector<HTMLInputElement>('#tagE');
  if (!eingabefeldTagE) throw new Error('Eingabefeld für Tag nicht gefunden');

  const jahr = Storage.get<number>('Jahr', { check: true });
  const monat = Storage.get<number>('Monat', { check: true });
  const letzterTag = dayjs([jahr, monat - 1]).daysInMonth();

  const datenImAktivenMonat = dataE.filter(item => dayjs(item.tagE).isSame(dayjs([jahr, monat - 1]), 'month'));
  const vorhandeneTage = new Set(datenImAktivenMonat.map(item => dayjs(item.tagE).date()).filter(day => day > 0));

  const parsedTag =
    typeof tag === 'number'
      ? tag
      : typeof tag === 'string' && tag.trim() !== ''
        ? Number(tag)
        : dayjs(eingabefeldTagE.value).date();

  let currentTag = Number.isFinite(parsedTag) ? parsedTag : vorhandeneTage.size > 0 ? Math.max(...vorhandeneTage) : 0;

  if (currentTag < 1 || currentTag > letzterTag) {
    currentTag = 0;
  }

  if (vorhandeneTage.size >= letzterTag) {
    document
      .querySelector<HTMLButtonElement>('#modal > div > form > div.modal-footer > button.btn.btn-primary')
      ?.setAttribute('disabled', 'true');
    showAllDaysOccupiedMessage();
    throw new Error('Alle Tage im Monat sind bereits belegt');
  }

  for (let i = 0; i < letzterTag; i++) {
    currentTag = currentTag >= letzterTag ? 1 : currentTag + 1;
    if (vorhandeneTage.has(currentTag)) continue;

    eingabefeldTagE.value = dayjs([jahr, monat - 1, currentTag]).format('YYYY-MM-DD');
    return;
  }

  document
    .querySelector<HTMLButtonElement>('#modal > div > form > div.modal-footer > button.btn.btn-primary')
    ?.setAttribute('disabled', 'true');
  showAllDaysOccupiedMessage();
  throw new Error('Fehler beim Finden eines Freien Tages');
}

function showAllDaysOccupiedMessage() {
  createSnackBar({
    message: `EWT<br/>Alle Tage im Monat sind bereits belegt.`,
    status: 'error',
    timeout: 3000,
    fixed: true,
  });
}
