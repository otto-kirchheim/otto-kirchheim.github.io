import { ArbeitszeiteingabePanel } from '@/shared/ui/arbeitszeit-editor/ArbeitszeiteingabePanel';
import { setupBundeslandAutoFill } from '@/shared/lib/date/holidayRegion';
import type { IVorgabenU, IVorgabenUPers } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { setupPersValidation } from '@/shared/lib/validation/addressValidation';
import { isLegacyArbeitszeit, migrateArbeitszeit } from '@/shared/lib/ressource/fieldMapper';
import { ladeEinstellungenTeile } from '@/shared/model/einstellungen/einstellungenTeile';
import { createElement } from 'react';
import { mount } from '@/shared/lib/react-root/reactRoot';

/**
 * Befüllt die Einstellungen-Maske aus den Benutzer-Vorgaben: persönliche Daten, Arbeitszeit, Tabs, AutoSave und -- über den Einstellungen-Slot jedes
 * Features -- dessen Felder (Bereitschafts-Vorgaben in `#tableVE`, Fahrzeiten, Zulagen). Wartet auf das Laden der Slots, damit deren Abschnitte gerendert sind.
 *
 * @param VorgabenU - Benutzer-Vorgaben; Standard ist der gespeicherte Datensatz aus dem Storage.
 * @throws {Error} Wenn ein Feature-Slot seine Tabelle nicht findet (Bereitschaft: `#tableVE`).
 */
export default async function generateEingabeMaskeEinstellungen(
  VorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true }),
): Promise<void> {
  const teile = await ladeEinstellungenTeile();

  // Bestandsnutzer haben diese Felder ggf. nicht im Dokument (kein Server-Default) -- ohne
  // Default fehlt der Object-Key komplett und setElementValues/saveEinstellungen sehen ihn nie.
  VorgabenU.Pers.Taetigkeit ??= '';
  VorgabenU.Pers.Entgeltgruppe ??= '';

  setElementValues<IVorgabenUPers>(VorgabenU.Pers);
  renderArbeitszeiteingabePanel(VorgabenU);
  populateEmailField();
  setupPersValidation();
  setupBundeslandAutoFill();
  populateTabCheckboxes(VorgabenU.Einstellungen?.aktivierteTabs);
  populateAutoSaveSettings(VorgabenU.Einstellungen?.autoSaveEnabled, VorgabenU.Einstellungen?.autoSaveDelayMs);

  for (const teil of teile) teil.part.read(VorgabenU);
}

/**
 * Trägt die im Storage gemerkte E-Mail-Adresse in `#EmailAnzeige` ein.
 */
function populateEmailField(): void {
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');
  if (!emailInput) return;
  emailInput.value = Storage.get<string>('BenutzerEmail', { default: '' });
}

// Zählt jeden Aufruf hoch, damit `key` sich ändert und React das Panel neu mountet statt
// den bestehenden Component-State (inkl. veralteter Arbeitszeit nach Act-as-Wechsel) zu behalten.
let arbeitszeitPanelRenderCount = 0;

/**
 * Mountet das `ArbeitszeiteingabePanel` in `#arbeitszeit-panel`.
 *
 * @param VorgabenU - Benutzer-Vorgaben; `Arbeitszeit` liefert die Anfangswerte (altes Format wird migriert).
 */
function renderArbeitszeiteingabePanel(VorgabenU: IVorgabenU): void {
  const panel = document.querySelector<HTMLDivElement>('#arbeitszeit-panel');
  if (!panel) return;
  const aZ = isLegacyArbeitszeit(VorgabenU.Arbeitszeit)
    ? migrateArbeitszeit(VorgabenU.Arbeitszeit)
    : VorgabenU.Arbeitszeit;
  mount(panel, createElement(ArbeitszeiteingabePanel, { key: arbeitszeitPanelRenderCount++, initialValues: aZ }));
}

/**
 * Schreibt jeden Wert in das Input/Select mit der gleichnamigen Id.
 *
 * @typeParam T - Objekttyp; die Schlüssel entsprechen den Element-Ids.
 * @param values - Werte je Feld-Id; nur vorhandene Input-/Select-Elemente werden befüllt.
 * @throws {Error} Wenn ein Wert weder Zahl noch String ist.
 */
function setElementValues<T>(values: T): void {
  for (const key in values) {
    const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`);
    const value = values[key as keyof T];
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
      if (isNumberOrString(value)) element.value = value.toString();
      else throw new Error('unbekannter Wert');
    }
  }
}

/**
 * Typprüfung für Zahl oder String.
 *
 * @param value - Zu prüfender Wert.
 * @returns `true` bei Zahl oder String.
 */
function isNumberOrString(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string';
}

/**
 * Hakt die Tab-Checkboxen (`data-tab-key`) entsprechend der aktivierten Tabs an.
 *
 * @param aktivierteTabs - Aktive Tab-Schlüssel; leer oder fehlend heißt alle aktiv.
 */
function populateTabCheckboxes(aktivierteTabs?: string[]): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]');
  for (const cb of Array.from(checkboxes)) {
    cb.checked = !aktivierteTabs || aktivierteTabs.length === 0 || aktivierteTabs.includes(cb.dataset.tabKey!);
  }
}

/**
 * Formatiert Millisekunden als lesbaren Zeittext (z.B. "10 s", "2 min").
 *
 * @param ms - Dauer in Millisekunden.
 * @returns Text in ms (unter 1 s), s (unter 1 min) oder min.
 */
export function formatDelayLabel(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60000)} min`;
}

/**
 * Mappt die Slider-Position (0-24) auf Millisekunden. Diskrete Stufen:
 * - 0-9: 1-10 s (1-s-Schritte)
 * - 10-19: 15-60 s (5-s-Schritte)
 * - 20-24: 60-300 s (1-min-Schritte)
 *
 * @param position - Slider-Position; wird auf 0-24 begrenzt.
 * @returns Verzögerung in Millisekunden.
 */
export function sliderPositionToMs(position: number): number {
  if (position < 0) position = 0;
  if (position > 24) position = 24;

  if (position <= 9) {
    // 1-10s: 1s Schritte
    return (position + 1) * 1000;
  } else if (position <= 19) {
    // 15-60s: 5s Schritte (Position 10 = 15s, Position 19 = 60s)
    return 10000 + (position - 9) * 5000;
  } else {
    // 60-300s: 1min Schritte (Position 20 = 60s, Position 24 = 300s)
    return 60000 + (position - 20) * 60000;
  }
}

/**
 * Mappt Millisekunden auf die nächstliegende Slider-Position (0-24), Umkehrung von `sliderPositionToMs`.
 *
 * @param ms - Verzögerung in Millisekunden.
 * @returns Slider-Position 0-24.
 */
export function msToSliderPosition(ms: number): number {
  if (ms <= 10000) {
    // 1-10s Bereich
    return Math.max(0, Math.min(9, Math.round(ms / 1000) - 1));
  } else if (ms <= 60000) {
    // 15-60s Bereich
    return Math.max(10, Math.min(19, Math.round((ms - 10000) / 5000) + 9));
  } else {
    // 60-300s Bereich
    return Math.max(20, Math.min(24, Math.round((ms - 60000) / 60000) + 20));
  }
}

/**
 * Setzt Checkbox, Slider und Label der AutoSave-Einstellungen und hängt den Live-Update-Listener des Labels an den Slider.
 *
 * @param autoSaveEnabled - AutoSave an/aus; Standard `true`.
 * @param autoSaveDelayMs - Verzögerung in ms; Standard 10000.
 */
function populateAutoSaveSettings(autoSaveEnabled?: boolean, autoSaveDelayMs?: number): void {
  const enabledCheckbox = document.querySelector<HTMLInputElement>('#autoSaveEnabled');
  const delayInput = document.querySelector<HTMLInputElement>('#autoSaveDelay');
  const delayLabel = document.querySelector<HTMLElement>('#autoSaveDelayLabel');

  if (enabledCheckbox) {
    enabledCheckbox.checked = autoSaveEnabled ?? true;
  }

  if (delayInput) {
    const delay = autoSaveDelayMs ?? 10000;
    const sliderPos = msToSliderPosition(delay);
    delayInput.value = String(sliderPos);

    if (delayLabel) {
      const ms = sliderPositionToMs(sliderPos);
      delayLabel.textContent = formatDelayLabel(ms);
    }

    // Event-Listener für Live-Update des Labels
    delayInput.addEventListener('input', () => {
      const newPos = Number(delayInput.value);
      const newMs = sliderPositionToMs(newPos);
      // Überschreibe den Wert, damit der tatsächliche ms-Wert gespeichert wird
      delayInput.dataset.actualMs = String(newMs);
      if (delayLabel) {
        delayLabel.textContent = formatDelayLabel(newMs);
      }
    });
  }
}
