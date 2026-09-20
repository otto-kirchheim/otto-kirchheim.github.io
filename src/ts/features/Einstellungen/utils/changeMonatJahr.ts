import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomHTMLTableElement } from '@/types';
import { isRowInMonat, resourceDefs } from '@/infrastructure/data/resourceConfig';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import { setMonatJahr } from '.';

/**
 * Reagiert auf eine Änderung von Monat oder Jahr: gleicht die Kopien des Felds an und wechselt bei gleichem Jahr den Monat (Speichern, Überschriften, Tabellenfilter).
 * Bei anderem Jahr bleiben die Knöpfe gesperrt, bis das Jahr über "Auswählen" geladen wird.
 *
 * @param event - Auslösendes `change`-Ereignis von `#Monat` oder `#Jahr`; ohne Ereignis entfällt nur der Abgleich der Feldkopien.
 * @throws {Error} Wenn `#Monat` oder `#Jahr` fehlt.
 */
export default function changeMonatJahr(event?: Event): void {
  // `#Monat` existiert zweimal (Desktop- und Mobile-Kopie im `AppHeader`), beide sind unkontrollierte
  // `<select>`-Elemente ohne React-Bindung. Ändert der User eine Kopie, muss die andere (und jeder spätere
  // `querySelector` in diesem Modul) denselben Wert sehen, sonst liest der Rest der Funktion die alte Kopie.
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

/**
 * Setzt den Monatsfilter der Tabellen aller angemeldeten Features. Ressourcen mit `filterMinYear` (Neben) zeigen davor keine Zeilen.
 *
 * @param options - `monat`: Monat, nach dem gefiltert wird; ohne Angabe der gespeicherte Monat.
 */
function changeMonatTableData({ monat }: { monat?: number } = {}) {
  const { monat: storedMonat, jahr } = getStoredMonatJahr();
  const activeMonat = monat ?? storedMonat;

  for (const resource of resourceDefs()) {
    document
      .querySelector<CustomHTMLTableElement>(`#${resource.tableId}`)
      ?.instance.rows.setFilter(
        row =>
          isRowInMonat(resource, row, activeMonat) &&
          (resource.filterMinYear === undefined || jahr >= resource.filterMinYear),
      );
  }
}
