import { createSnackBar } from '../../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../../../interfaces';
import {
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromN,
  isEwtInMonat,
  Storage,
  buttonDisable,
  getStoredMonatJahr,
  setDisableButton,
} from '../../../utilities';
import { setMonatJahr } from '.';

export default function changeMonatJahr(): void {
  const monatInput = document.querySelector<HTMLInputElement>('#Monat');
  const jahrInput = document.querySelector<HTMLInputElement>('#Jahr');
  if (!monatInput || !jahrInput) throw new Error('Input Monat oder Jahr nicht gefunden');

  if (Storage.compare<number>('Jahr', Number(jahrInput.value))) {
    buttonDisable(false);
    if (!navigator.onLine) setDisableButton(true);

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
}
