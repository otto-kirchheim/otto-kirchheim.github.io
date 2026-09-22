import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { IEinstellungenBeitrag, IVorgabenU, IVorgabenUPers } from '@/types';
import { PERS_FIELD_LABELS, setupPersValidation, validatePersInput } from '@/shared/lib/validation/addressValidation';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { sliderPositionToMs } from './generateEingabeMaskeEinstellungen';
import { getArbeitszeitPanelState } from '../components/arbeitszeitPanelState';
import { getEinstellungenTeile } from '@/infrastructure/ui/einstellungenTeile';

/**
 * Liest die Einstellungen-Maske aus (persönliche Daten, Arbeitszeit, Tabs, AutoSave sowie die Felder der Features über deren Einstellungen-Slot), validiert sie und speichert sie in `VorgabenU`.
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

  // Felder der Features (Fahrzeiten, benoetigte Zulagen, Bereitschafts-Vorgaben ...) aus deren Einstellungen-Slots; ein Feature
  // ohne geladenen Slot hat keine Felder und laesst seine Werte unveraendert. Ein Fehler (z. B. unvollstaendige Fahrzeiten) bricht ab.
  const featureEinstellungen: NonNullable<IEinstellungenBeitrag['Einstellungen']> = {};
  const featureBeitraege = getEinstellungenTeile().map(teil => teil.part.collect(VorgabenU));
  for (const { Einstellungen: einstellungen, ...felder } of featureBeitraege) {
    Object.assign(VorgabenU, felder);
    Object.assign(featureEinstellungen, einstellungen);
  }

  const aktivierteTabs: string[] = [];
  for (const cb of Array.from(document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]'))) {
    if (cb.checked) aktivierteTabs.push(cb.dataset.tabKey!);
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
    ...featureEinstellungen,
    autoSaveEnabled,
    autoSaveDelayMs,
  };

  updateTabVisibility(VorgabenU.Einstellungen.aktivierteTabs);

  Storage.set('VorgabenU', VorgabenU);

  return VorgabenU;
}
