import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { IVorgabenU, IVorgabenUPers, IVorgabenUfZ, IVorgabenUvorgabenB } from '@/types';
import {
  PERS_FIELD_LABELS,
  setupPersValidation,
  validatePersInput,
} from '@/infrastructure/validation/addressValidation';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as tableToArray } from '@/infrastructure/data/tableToArray';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { sliderPositionToMs } from './generateEingabeMaskeEinstellungen';
import { getArbeitszeitPanelState } from '../components/arbeitszeitPanelState';
import { getFahrzeitPanelState } from '../components/fahrzeitPanelState';

export default function saveEinstellungen(): IVorgabenU {
  const VorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });
  setupPersValidation();

  const updateVorgabenU = <T, K extends keyof T>(obj: T, key: K, value: T[K]): void => {
    obj[key] = value;
  };

  const numberFields: ReadonlySet<string> = new Set(['kmArbeitsort', 'kmnBhf']);
  for (const key of Object.keys(VorgabenU.pers)) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`);
    if (!input) continue;

    const isValid = validatePersInput(input);
    if (!isValid) {
      const label = PERS_FIELD_LABELS[key as keyof typeof PERS_FIELD_LABELS] ?? key;
      createSnackBar({
        message: `Einstellungen > Persönliche Daten > "${label}": ${input.validationMessage}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
      input.reportValidity();
      input.focus();

      if (key === 'Adress1' || key === 'Adress2' || key === 'ErsteTkgStAdresse') {
        throw new Error('Adressformat ungültig');
      }

      throw new Error('Persönliche Daten fehlerhaft');
    }

    const value = numberFields.has(key) ? Number(input.value) : input.value;
    updateVorgabenU(VorgabenU.pers, key as keyof IVorgabenUPers, value as IVorgabenUPers[keyof IVorgabenUPers]);
  }

  const panelState = getArbeitszeitPanelState();
  if (panelState) {
    VorgabenU.aZ = panelState;
  }

  const fahrzeitState = getFahrzeitPanelState();
  if (fahrzeitState) {
    VorgabenU.fZ = collectFahrzeiten(fahrzeitState);
  }

  const aktivierteTabs: string[] = [];
  for (const cb of Array.from(document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]'))) {
    if (cb.checked) aktivierteTabs.push(cb.dataset.tabKey!);
  }

  const zulagenContainer = document.querySelector('#settings-zulagen-list');
  const benoetigteZulagen: string[] = [];
  if (zulagenContainer) {
    for (const cb of Array.from(
      document.querySelectorAll<HTMLInputElement>('#settings-zulagen-list input[data-zulage-code]'),
    )) {
      if (cb.checked) benoetigteZulagen.push(cb.dataset.zulageCode!);
    }
  }

  // Sammle neue Einstellungsfelder: AutoSave
  const autoSaveEnabledCheckbox = document.querySelector<HTMLInputElement>('#autoSaveEnabled');
  const autoSaveDelayInput = document.querySelector<HTMLInputElement>('#autoSaveDelay');

  const autoSaveEnabled = autoSaveEnabledCheckbox?.checked ?? VorgabenU.Einstellungen.autoSaveEnabled ?? true;
  const autoSaveDelayMs = autoSaveDelayInput
    ? sliderPositionToMs(Number(autoSaveDelayInput.value))
    : (VorgabenU.Einstellungen.autoSaveDelayMs ?? 10000);

  VorgabenU.Einstellungen = {
    aktivierteTabs,
    ...(benoetigteZulagen.length > 0 && { benoetigteZulagen }),
    autoSaveEnabled,
    autoSaveDelayMs,
  };

  updateTabVisibility(VorgabenU.Einstellungen.aktivierteTabs);

  VorgabenU.vorgabenB = Object.fromEntries(tableToArray('tableVE').entries()) as { [key: string]: IVorgabenUvorgabenB };

  Storage.set('VorgabenU', VorgabenU);

  return VorgabenU;
}

function collectFahrzeiten(rows: IVorgabenUfZ[]): IVorgabenUfZ[] {
  const liste: IVorgabenUfZ[] = [];
  for (const { key, text, value } of rows) {
    // Komplett leere Zeilen (z.B. gerade hinzugefügt) werden still verworfen.
    if (!key && !text && !value) continue;

    // Beschreibung (text) ist ein reines Notizfeld und darf leer bleiben.
    if (!key || !value) {
      const fehlend = [!key && 'Tätigkeitsstätte', !value && 'Fahrzeit'].filter(Boolean).join(' / ');
      createSnackBar({
        message: `Einstellungen > Fahrzeiten > "${key || text}": ${fehlend} fehlt`,
        status: 'error',
        timeout: 3000,
        fixed: true,
      });
      throw new Error(`${fehlend} fehlt`);
    }
    liste.push({ key, text, value });
  }

  return liste;
}
