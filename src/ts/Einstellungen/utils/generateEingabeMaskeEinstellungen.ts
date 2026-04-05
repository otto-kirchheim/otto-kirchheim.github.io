import { generateEingabeTabelleEinstellungenVorgabenB, saveTableDataVorgabenU } from '.';
import { ZULAGEN_CATALOG } from './zulagenCatalog';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft';
import { CustomTable } from '../../class/CustomTable';
import { setupBundeslandAutoFill } from '../../utilities/holidayRegion';
import type {
  CustomHTMLTableElement,
  IVorgabenU,
  IVorgabenUPers,
  IVorgabenUaZ,
  IVorgabenUvorgabenB,
} from '../../interfaces';
import { Storage, setupPersValidation } from '../../utilities';

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
