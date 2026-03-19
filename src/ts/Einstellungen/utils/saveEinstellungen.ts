import { createSnackBar } from '../../class/CustomSnackbar';
import type { IVorgabenU, IVorgabenUPers, IVorgabenUaZ, IVorgabenUvorgabenB } from '../../interfaces';
import { Storage, tableToArray, updateTabVisibility } from '../../utilities';

export default function saveEinstellungen(): IVorgabenU {
  const VorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });

  const updateVorgabenU = <T, K extends keyof T>(obj: T, key: K, value: T[K]): void => {
    obj[key] = value;
  };

  const numberFields: ReadonlySet<string> = new Set(['kmArbeitsort', 'kmnBhf']);
  for (const key of Object.keys(VorgabenU.pers)) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`);
    if (!input) continue;
    const value = numberFields.has(key) ? Number(input.value) || 0 : input.value;
    updateVorgabenU(VorgabenU.pers, key as keyof IVorgabenUPers, value as IVorgabenUPers[keyof IVorgabenUPers]);
  }

  for (const key of Object.keys(VorgabenU.aZ)) {
    const input = document.querySelector<HTMLInputElement>(`#${key}`);
    if (!input) continue;
    if (input.value) updateVorgabenU(VorgabenU.aZ, key as keyof IVorgabenUaZ, input.value);
    else if (input.required) {
      createSnackBar({
        message: `Einstellungen > Persönliche Daten > "${key}" fehlt`,
        status: 'error',
        timeout: 3000,
        fixed: true,
      });
      throw new Error('Persönliche Daten fehlerhaft fehlt');
    }
  }

  VorgabenU.fZ = table_to_array_einstellungen('TbodyTätigkeitsstätten');

  const aktivierteTabs: string[] = [];
  for (const cb of document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]')) {
    if (cb.checked) aktivierteTabs.push(cb.dataset.tabKey!);
  }

  const zulagenContainer = document.querySelector('#settings-zulagen-list');
  if (zulagenContainer) {
    const benoetigteZulagen: string[] = [];
    for (const cb of document.querySelectorAll<HTMLInputElement>('#settings-zulagen-list input[data-zulage-code]')) {
      if (cb.checked) benoetigteZulagen.push(cb.dataset.zulageCode!);
    }
    VorgabenU.Einstellungen = { ...VorgabenU.Einstellungen, aktivierteTabs, benoetigteZulagen };
  } else {
    VorgabenU.Einstellungen = { ...VorgabenU.Einstellungen, aktivierteTabs };
  }

  updateTabVisibility(VorgabenU.Einstellungen.aktivierteTabs);

  VorgabenU.vorgabenB = Object.fromEntries(tableToArray('tableVE').entries()) as { [key: string]: IVorgabenUvorgabenB };

  Storage.set('VorgabenU', VorgabenU);

  return VorgabenU;
}

function table_to_array_einstellungen(table_id: string): { key: string; text: string; value: string }[] | [] {
  const myData = document.querySelector<HTMLTableElement>(`#${table_id}`)?.rows;
  if (!myData) return [];
  const my_liste: { key: string; text: string; value: string }[] = [];
  for (const myDatum of Array.from(myData)) {
    const el = myDatum.children;
    const keyInput = el[0].querySelector<HTMLInputElement>('input');
    const textInput = el[1].querySelector<HTMLInputElement>('input');
    const valueInput = el[2].querySelector<HTMLInputElement>('input');
    if (!keyInput || !textInput || !valueInput) continue;

    const key: string = keyInput.value;
    if (!key) continue;

    const text: string = textInput.value;
    const value: string = valueInput.value;
    if (!text || !value) {
      createSnackBar({
        message: `Einstellungen > Fahrzeiten > "${key}": Beschreibung / Fahrzeit fehlt`,
        status: 'error',
        timeout: 3000,
        fixed: true,
      });
      throw new Error('Beschreibung / Fahrzeit fehlt');
    }
    my_liste.push({ key, text, value });
  }

  return my_liste;
}
