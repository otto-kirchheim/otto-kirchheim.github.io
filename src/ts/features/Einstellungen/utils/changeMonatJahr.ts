import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN } from '@/types';
import {
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEA,
  getMonatFromN,
  isEwtInMonat,
} from '@/infrastructure/date/getMonatFromItem';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { setMonatJahr } from '.';

export default function changeMonatJahr(event?: Event): void {
  // `#Monat` existiert seit dem Shell-Umbau zweimal (Desktop- + Mobile-Control-Panel) --
  // beide Kopien sind eigenstaendige, unkontrollierte `<select>`-Elemente ohne React-Bindung.
  // Aendert der User die MOBILE Kopie, muss die Desktop-Kopie (und jeder spaetere `querySelector`
  // hier im Modul) denselben Wert sehen, sonst liest der Rest der Funktion die alte Kopie.
  const zielInput = event?.target as HTMLInputElement | undefined;
  if (zielInput?.id === 'Monat' || zielInput?.id === 'Jahr') {
    document
      .querySelectorAll<HTMLInputElement>(`#${zielInput.id}`)
      .forEach(el => el !== zielInput && (el.value = zielInput.value));
  }

  const monatInput = document.querySelector<HTMLInputElement>('#Monat');
  const jahrInput = document.querySelector<HTMLInputElement>('#Jahr');
  if (!monatInput || !jahrInput) throw new Error('Input Monat oder Jahr nicht gefunden');

  if (Storage.compare<number>('Jahr', Number(jahrInput.value))) {
    buttonDisable(false);
    if (!navigator.onLine) buttonDisable(true);

    if (!Storage.compare<number>('Monat', Number(monatInput.value))) {
      const jahr = Number(jahrInput.value);
      const monat = Number(monatInput.value);
      Storage.set('Monat', monat);
      setMonatJahr(jahr, monat);
      changeMonatTableData({ monat });

      createSnackBar({ message: `Monat geändert.`, status: 'success', timeout: 3000, fixed: true });
    }
    return;
  } else changeMonatTableData();

  buttonDisable(true);
  const auswaehlenBtn = document.querySelector<HTMLButtonElement>('#btnAuswaehlen');
  if (navigator.onLine && auswaehlenBtn) auswaehlenBtn.disabled = false;
}

function changeMonatTableData({ monat }: { monat?: number } = {}) {
  const { monat: storedMonat, jahr } = getStoredMonatJahr();
  const activeMonat = monat ?? storedMonat;

  document
    .querySelector<CustomHTMLTableElement<IDatenBZ>>('#tableBZ')
    ?.instance.rows.setFilter(row => getMonatFromBZ(row) === activeMonat);
  document
    .querySelector<CustomHTMLTableElement<IDatenBE>>('#tableBE')
    ?.instance.rows.setFilter(row => getMonatFromBE(row) === activeMonat);
  document
    .querySelector<CustomHTMLTableElement<IDatenEWT>>('#tableE')
    ?.instance.rows.setFilter(row => isEwtInMonat(row, activeMonat));
  document
    .querySelector<CustomHTMLTableElement<IDatenN>>('#tableN')
    ?.instance.rows.setFilter(row => getMonatFromN(row) === activeMonat && jahr >= 2024);
  document
    .querySelector<CustomHTMLTableElement<IDatenEA>>('#tableEA')
    ?.instance.rows.setFilter(row => getMonatFromEA(row) === activeMonat);
}
