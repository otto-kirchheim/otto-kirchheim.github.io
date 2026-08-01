import type { CustomTable } from '@/infrastructure/table/CustomTable';
import dayjs from '@/infrastructure/date/configDayjs';
import { persistNebengeldTableData } from '.';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { IDatenN } from '@/types';
import { formatNebengeldZulagen, readNebengeldZulagenFromForm, validateNebengeldZulagen } from './nebengeldZulagen';

export default function addNebengeldTag(form: HTMLDivElement | HTMLFormElement, tableN: CustomTable<IDatenN>): void {
  const select = form.querySelector<HTMLSelectElement>('#Tag');
  if (!select) throw new Error("Select element with ID 'Tag' not found");
  let idN = select.selectedIndex;
  if (idN < 0) return;
  const daten = JSON.parse(select.value) as IDatenN;
  const Zulagen = readNebengeldZulagenFromForm(form);
  const validationErrors = validateNebengeldZulagen(Zulagen);
  if (validationErrors.length > 0) {
    createSnackBar({
      message: validationErrors.join('<br/>'),
      status: 'warning',
      timeout: 5000,
      fixed: true,
    });
    return;
  }

  daten.Zulagen = Zulagen;
  daten.zulagenAnzeigeN = formatNebengeldZulagen(Zulagen);

  const inputAuftragN = form.querySelector<HTMLInputElement>('#AuftragN');
  if (!inputAuftragN) throw new Error("Input element with ID 'AuftragN' not found");
  daten.Auftragsnummer = inputAuftragN.value;

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
    return dayjs(existingRow.cells.Tag, 'DD.MM.YYYY').isSame(dayjs(daten.Tag, 'DD.MM.YYYY'), 'day');
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

  // Statt eines neuen Datensatzes einen bereits zum Löschen vorgemerkten Eintrag
  // für denselben Tag reaktivieren (bleibt als Update statt Delete+Create erhalten).
  const deletedRowSameTag = ftN.rows.array.find(
    existingRow =>
      existingRow._state === 'deleted' &&
      dayjs(existingRow.cells.Tag, 'DD.MM.YYYY').isSame(dayjs(daten.Tag, 'DD.MM.YYYY'), 'day'),
  );

  if (deletedRowSameTag) {
    deletedRowSameTag.undoDelete();
    deletedRowSameTag.val(daten);
  } else {
    ftN.rows.add(daten);
  }
  persistNebengeldTableData(ftN);
}
