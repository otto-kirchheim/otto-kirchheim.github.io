import type { CustomTable } from '../../../class/CustomTable';
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from '../../../interfaces';
import { createSnackBar } from '../../../class/CustomSnackbar';
import dayjs from '../../../infrastructure/date/configDayjs';
import { calculateBuchungstagEwt, calculateEwtEintraege, setNaechsterEwtTag, persistEwtTableData } from '.';

export default function addEwtTag(
  modal: CustomHTMLDivElement<IDatenEWT>,
  vorgabenU: IVorgabenU,
  berechneBuero: boolean = false,
  tableE: CustomTable<IDatenEWT>,
): void {
  // Get the input and select elements
  const tagEInput = modal.querySelector<HTMLInputElement>('#tagE');
  const eOrtESelect = modal.querySelector<HTMLSelectElement>('#EOrt');
  const schichtESelect = modal.querySelector<HTMLSelectElement>('#Schicht');
  const berechnenInput = modal.querySelector<HTMLInputElement>('#berechnen1');

  // Throw an error if any of the required elements is missing
  if (!tagEInput) throw new Error('TagE input not found');
  if (!eOrtESelect) throw new Error('EOrt select not found');
  if (!schichtESelect) throw new Error('Schicht select not found');
  if (!berechnenInput) throw new Error('Berechnen input not found');

  // Get the values of the input and select elements
  const tagE = tagEInput.value;
  const eOrtE = eOrtESelect.value;
  const schichtE = schichtESelect.value;
  const berechnen = berechnenInput.checked;

  // Create a new data object with the values
  let data: IDatenEWT = {
    tagE,
    buchungstagE: tagE,
    eOrtE,
    schichtE,
    abWE: '',
    ab1E: '',
    anEE: '',
    beginE: '',
    endeE: '',
    abEE: '',
    an1E: '',
    anWE: '',
    berechnen,
  };

  if (berechneBuero) {
    data.berechnen = true;
    data = calculateEwtEintraege(vorgabenU, [data])[0];
    data = { ...data, ...{ ab1E: '', anEE: '', abEE: '', an1E: '', berechnen: false } };
  } else {
    data = calculateEwtEintraege(vorgabenU, [data])[0];
  }
  data.buchungstagE = calculateBuchungstagEwt(data);

  const ftE = tableE;

  const hasExactDuplicate = ftE.rows.array.some(existingRow => {
    if (existingRow._state === 'deleted') return false;
    const existing = existingRow.cells;
    return (
      existing.tagE === data.tagE &&
      existing.eOrtE === data.eOrtE &&
      existing.schichtE === data.schichtE &&
      existing.abWE === data.abWE &&
      existing.ab1E === data.ab1E &&
      existing.anEE === data.anEE &&
      existing.beginE === data.beginE &&
      existing.endeE === data.endeE &&
      existing.abEE === data.abEE &&
      existing.an1E === data.an1E &&
      existing.anWE === data.anWE &&
      existing.berechnen === data.berechnen
    );
  });

  if (hasExactDuplicate) {
    createSnackBar({
      message: 'EWT<br/>Ein identischer Eintrag ist bereits vorhanden.',
      status: 'warning',
      timeout: 3500,
      fixed: true,
    });
    return;
  }

  // Add the new row to the table and save the data
  ftE.rows.add(data);
  persistEwtTableData(ftE);

  // Calculate and set the next tag value
  const existingRows: IDatenEWT[] = ftE.getRows().map(row => row.cells);
  setNaechsterEwtTag(dayjs(tagE).date(), existingRows);

  // Trigger re-calculation in the add modal (e.g. buchungstag hint) after tag changes.
  tagEInput.dispatchEvent(new Event('change', { bubbles: true }));
}
