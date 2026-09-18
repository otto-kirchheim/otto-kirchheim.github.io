import { generateEingabeTabelleEinstellungenVorgabenB, saveTableDataVorgabenU } from '.';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft/utils/constants';
import { ArbeitszeiteingabePanel, FahrzeitenPanel, ZulagenCheckboxList } from '../components';
import { CustomTable } from '@/infrastructure/table/CustomTable';
import { setupBundeslandAutoFill } from '@/infrastructure/date/holidayRegion';
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUPers, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { setupPersValidation } from '@/infrastructure/validation/addressValidation';
import { isLegacyArbeitszeit, migrateArbeitszeit } from '@/infrastructure/data/fieldMapper';
import { createElement } from 'react';
import { mount } from '@/infrastructure/ui';

export default function generateEingabeMaskeEinstellungen(
  VorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true }),
): void {
  const VorgabenB = VorgabenU.VorgabenB ?? BereitschaftsEinsatzZeiträume;

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
  populateZulagenCheckboxes(VorgabenU.Einstellungen?.benoetigteZulagen);
  populateAutoSaveSettings(VorgabenU.Einstellungen?.autoSaveEnabled, VorgabenU.Einstellungen?.autoSaveDelayMs);

  renderFahrzeitenPanel(VorgabenU);

  const table = document.querySelector<CustomHTMLTableElement<IVorgabenUvorgabenB>>(`#tableVE`);
  if (!table) throw new Error('Tabelle nicht gefunden');
  const ftVE = table.instance;

  if (ftVE instanceof CustomTable) {
    // rows.load() ist synchron (siehe Rows.ts) -- saveTableDataVorgabenU() liest danach
    // garantiert den frisch geladenen State, kein Race moeglich.
    ftVE.rows.load([...Object.values(VorgabenB)]);
    saveTableDataVorgabenU(ftVE);
  } else generateEingabeTabelleEinstellungenVorgabenB(VorgabenB);
}

function populateEmailField(): void {
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');
  if (!emailInput) return;
  emailInput.value = Storage.get<string>('BenutzerEmail', { default: '' });
}

// Zählt jeden Aufruf hoch, damit `key` sich ändert und React das Panel neu mountet statt
// den bestehenden Component-State (inkl. veralteter Arbeitszeit nach Act-as-Wechsel) zu behalten.
let arbeitszeitPanelRenderCount = 0;
let fahrzeitPanelRenderCount = 0;
let zulagenPanelRenderCount = 0;

function renderFahrzeitenPanel(VorgabenU: IVorgabenU): void {
  const panel = document.querySelector<HTMLDivElement>('#fahrzeiten-panel');
  if (!panel) return;
  mount(
    panel,
    createElement(FahrzeitenPanel, { key: fahrzeitPanelRenderCount++, initialRows: VorgabenU.Fahrzeit ?? [] }),
  );
}

function renderArbeitszeiteingabePanel(VorgabenU: IVorgabenU): void {
  const panel = document.querySelector<HTMLDivElement>('#arbeitszeit-panel');
  if (!panel) return;
  const aZ = isLegacyArbeitszeit(VorgabenU.Arbeitszeit)
    ? migrateArbeitszeit(VorgabenU.Arbeitszeit)
    : VorgabenU.Arbeitszeit;
  mount(panel, createElement(ArbeitszeiteingabePanel, { key: arbeitszeitPanelRenderCount++, initialValues: aZ }));
}

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

function isNumberOrString(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string';
}

function populateTabCheckboxes(aktivierteTabs?: string[]): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('#collapseFive input[data-tab-key]');
  for (const cb of Array.from(checkboxes)) {
    cb.checked = !aktivierteTabs || aktivierteTabs.length === 0 || aktivierteTabs.includes(cb.dataset.tabKey!);
  }
}

function populateZulagenCheckboxes(benoetigteZulagen?: string[]): void {
  const host = document.querySelector<HTMLDivElement>('#settings-zulagen-list');
  if (!host) return;
  mount(host, createElement(ZulagenCheckboxList, { key: zulagenPanelRenderCount++, benoetigteZulagen }));
}

/**
 * Formatiert Millisekunden als lesbaren Zeittext (z.B. "10 s", "2 min").
 */
export function formatDelayLabel(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  return `${Math.round(ms / 60000)} min`;
}

/**
 * Mappt Slider-Position (0-24) auf Millisekunden.
 * Diskrete Stufen:
 * - 0-9: 1-10s (1s Schritte)
 * - 10-19: 15-60s (5s Schritte, beginnend bei 15s)
 * - 20-24: 60-300s (1min Schritte)
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
 * Mappt Millisekunden auf Slider-Position (0-24).
 * Findet die nächste verfügbare Position.
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
