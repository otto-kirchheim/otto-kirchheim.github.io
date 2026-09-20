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

/**
 * Liest die Einstellungen-Maske aus (persönliche Daten, Arbeitszeit, Fahrzeiten, Tabs, Zulagen, AutoSave, Bereitschafts-Vorgaben), validiert sie und speichert sie in `VorgabenU`.
 *
 * @returns Die aktualisierten und im Storage gespeicherten `VorgabenU`.
 * @throws {Error} Bei ungültigen persönlichen Daten oder unvollständigen Fahrzeiten (mit Snackbar-Hinweis).
 */
export default function saveEinstellungen(): IVorgabenU {
  const VorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });
  // Bestandsnutzer haben diese Felder ggf. nicht im Dokument (kein Server-Default) -- ohne
  // Default fehlt der Object-Key komplett und die Object.keys-Schleife unten liest den Input nie ein.
  VorgabenU.Pers.Taetigkeit ??= '';
  VorgabenU.Pers.Entgeltgruppe ??= '';
  setupPersValidation();

  /**
   * Setzt typsicher einen Wert an einem Schlüssel des Objekts.
   *
   * @typeParam T - Objekttyp.
   * @typeParam K - Schlüssel von `T`.
   * @param obj - Zielobjekt.
   * @param key - Zu setzender Schlüssel.
   * @param value - Neuer Wert.
   */
  const updateVorgabenU = <T, K extends keyof T>(obj: T, key: K, value: T[K]): void => {
    obj[key] = value;
  };

  const numberFields: ReadonlySet<string> = new Set(['kmArbeitsort', 'kmnBhf']);
  for (const key of Object.keys(VorgabenU.Pers)) {
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
    updateVorgabenU(VorgabenU.Pers, key as keyof IVorgabenUPers, value as IVorgabenUPers[keyof IVorgabenUPers]);
  }

  const panelState = getArbeitszeitPanelState();
  if (panelState) {
    VorgabenU.Arbeitszeit = panelState;
  }

  const fahrzeitState = getFahrzeitPanelState();
  if (fahrzeitState) {
    VorgabenU.Fahrzeit = collectFahrzeiten(fahrzeitState);
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

  VorgabenU.VorgabenB = Object.fromEntries(tableToArray('tableVE').entries()) as { [key: string]: IVorgabenUvorgabenB };

  Storage.set('VorgabenU', VorgabenU);

  return VorgabenU;
}

/**
 * Übernimmt die Fahrzeiten-Zeilen: leere Zeilen entfallen, unvollständige lösen einen Fehler aus.
 *
 * @param rows - Zeilen des Fahrzeiten-Panels.
 * @returns Nur die vollständigen Zeilen.
 * @throws {Error} Wenn Tätigkeitsstätte oder Fahrzeit einer nicht leeren Zeile fehlt (mit Snackbar-Hinweis).
 */
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
