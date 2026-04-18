import { generateEingabeTabelleEinstellungenVorgabenB, saveTableDataVorgabenU } from '.';
import { ZULAGEN_CATALOG } from './zulagenCatalog';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft';
import { CustomTable } from '../../../class/CustomTable';
import { setupBundeslandAutoFill } from '../../../infrastructure/date/holidayRegion';
import type {
  CustomHTMLTableElement,
  IVorgabenU,
  IVorgabenUPers,
  IVorgabenUaZ,
  IVorgabenUvorgabenB,
} from '../../../interfaces';
import { Storage, setupPersValidation } from '../../../utilities';

export default function generateEingabeMaskeEinstellungen(
  VorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true }),
): void {
  const VorgabenB = VorgabenU.vorgabenB ?? BereitschaftsEinsatzZeiträume;

  setElementValues<IVorgabenUPers>(VorgabenU.pers);
  setElementValues<IVorgabenUaZ>(VorgabenU.aZ);
  populateEmailField();
  setupPersValidation();
  setupBundeslandAutoFill();
  populateTabCheckboxes(VorgabenU.Einstellungen?.aktivierteTabs);
  populateZulagenCheckboxes(VorgabenU.Einstellungen?.benoetigteZulagen);
  populateAutoSaveSettings(VorgabenU.Einstellungen?.autoSaveEnabled, VorgabenU.Einstellungen?.autoSaveDelayMs);

  populateTable(VorgabenU);

  const table = document.querySelector<CustomHTMLTableElement<IVorgabenUvorgabenB>>(`#tableVE`);
  if (!table) throw new Error('Tabelle nicht gefunden');
  const ftVE = table.instance;

  if (ftVE instanceof CustomTable) {
    ftVE.rows.load([...Object.values(VorgabenB)]);
    saveTableDataVorgabenU(ftVE);
    console.log('saved', ftVE);
  } else generateEingabeTabelleEinstellungenVorgabenB(VorgabenB);
}

function populateEmailField(): void {
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');
  if (!emailInput) return;
  emailInput.value = Storage.get<string>('BenutzerEmail', { default: '' });
}

function populateTable(VorgabenU: IVorgabenU): void {
  const tbody = document.querySelector<HTMLTableElement>('#TbodyTätigkeitsstätten');
  if (tbody === null) throw new Error();
  tbody.innerHTML = '';

  for (const { key, text, value } of VorgabenU.fZ) {
    const tr = tbody.insertRow();
    createInput(tr, 0, 'text', key, 'Tätigkeitsstätte');
    createInput(tr, 1, 'text', text, 'Beschreibung');
    createInput(tr, 2, 'time', value, 'Fahrzeit');
  }

  for (let i = 0; i < 3; i++) {
    const tr = tbody.insertRow();
    createInput(tr, 0, 'text', '', 'Tätigkeitsstätte');
    createInput(tr, 1, 'text', '', 'Beschreibung');
    createInput(tr, 2, 'time', '', 'Fahrzeit');
  }

  function createInput(
    tr: HTMLTableRowElement,
    position: number,
    type: 'text' | 'time',
    value: string,
    labelText: string,
  ): void {
    const td = tr.insertCell(position);
    const group = document.createElement('div');
    group.className = 'input-group input-group-sm input-group-mobile-fahrzeit';

    const label = document.createElement('span');
    label.className = 'input-group-text d-md-none';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-control text-center';
    input.value = value;

    group.appendChild(label);
    group.appendChild(input);
    td.appendChild(group);
  }
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

  const selectedCodes = new Set(benoetigteZulagen ?? []);
  host.innerHTML = '';

  for (const zulage of ZULAGEN_CATALOG) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check';

    const input = document.createElement('input');
    input.className = 'form-check-input';
    input.type = 'checkbox';
    input.id = `zulage-${zulage.code}`;
    input.dataset.zulageCode = zulage.code;
    input.checked = selectedCodes.has(zulage.code);

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.setAttribute('for', input.id);
    label.textContent = `${zulage.code} - ${zulage.label}`;

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    host.appendChild(wrapper);
  }
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
