import type { CustomTable } from '../../class/CustomTable';
import dayjs from '../../utilities/configDayjs';
import { persistNebengeldTableData } from '.';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { IDatenN } from '../../interfaces';

export default function addNebengeldTag(form: HTMLDivElement | HTMLFormElement, tableN: CustomTable<IDatenN>): void {
  const select = form.querySelector<HTMLSelectElement>('#tagN');
  if (!select) throw new Error("Select element with ID 'tagN' not found");
  let idN = select.selectedIndex;
  if (idN < 0) return;
  const daten = JSON.parse(select.value) as IDatenN;

  const inputAnzahl040N = form.querySelector<HTMLInputElement>('#anzahl040N');
  if (!inputAnzahl040N) throw new Error("Input element with ID 'anzahl040N' not found");
  daten.anzahl040N = +inputAnzahl040N.value;

  const inputAuftragN = form.querySelector<HTMLInputElement>('#AuftragN');
  if (!inputAuftragN) throw new Error("Input element with ID 'AuftragN' not found");
  daten.auftragN = inputAuftragN.value;

  select.options[idN].selected = false;
  select.options[idN].disabled = true;
  idN++;
  while (idN < select.length) {
    if (!select.options[idN].disabled) {
      select.options[idN].selected = true;
      break;
    }
    idN++;
  }

  inputAuftragN.value = '';

  const ftN = tableN;

  const hasDuplicateDay = ftN.rows.array.some(existingRow => {
    if (existingRow._state === 'deleted') return false;
    return dayjs(existingRow.cells.tagN, 'DD.MM.YYYY').isSame(dayjs(daten.tagN, 'DD.MM.YYYY'), 'day');
  });

  if (hasDuplicateDay) {
    createSnackBar({
      message: 'Nebenbezug<br/>Für diesen Tag existiert bereits ein Eintrag.',
      status: 'warning',
      timeout: 3500,
      fixed: true,
    });
    return;
  }

  ftN.rows.add(daten);
  persistNebengeldTableData(ftN);
}
