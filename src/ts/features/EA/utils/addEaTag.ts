import type { CustomTable } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLDivElement, IDatenEA } from '@/types';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import dayjs from '@/infrastructure/date/configDayjs';
import { persistEaTableData } from '.';

/** @returns true, wenn die Zeile angelegt/reaktiviert wurde; false bei Abbruch (Duplikat-Tag). */
export default function addEaTag(modal: CustomHTMLDivElement<IDatenEA>, tableEA: CustomTable<IDatenEA>): boolean {
  const tagInput = modal.querySelector<HTMLInputElement>('#Tag');
  const ewtRefSelect = modal.querySelector<HTMLSelectElement>('#ewtRefSelect');
  const dauerInput = modal.querySelector<HTMLInputElement>('#Dauer');
  const taetigkeitInput = modal.querySelector<HTMLInputElement>('#Taetigkeit');
  const entgeltgruppeInput = modal.querySelector<HTMLInputElement>('#Entgeltgruppe');

  if (!tagInput) throw new Error('Tag input not found');
  if (!dauerInput) throw new Error('Dauer input not found');
  if (!taetigkeitInput) throw new Error('Taetigkeit input not found');
  if (!entgeltgruppeInput) throw new Error('Entgeltgruppe input not found');

  const Tag = dayjs(tagInput.value).format('DD.MM.YYYY');

  const data: IDatenEA = {
    EWT: ewtRefSelect?.value || undefined,
    Tag,
    Dauer: dauerInput.value,
    Taetigkeit: taetigkeitInput.value,
    Entgeltgruppe: entgeltgruppeInput.value,
  };

  const ftEA = tableEA;

  const hasDuplicateDay = ftEA.rows.array.some(existingRow => {
    if (existingRow._state === 'deleted') return false;
    return existingRow.cells.Tag === Tag;
  });

  if (hasDuplicateDay) {
    createSnackBar({
      message: 'Entgeltausgleich<br/>Für diesen Tag existiert bereits ein Eintrag.',
      status: 'warning',
      timeout: 3500,
      fixed: true,
    });
    return false;
  }

  const deletedRowSameTag = ftEA.rows.array.find(
    existingRow => existingRow._state === 'deleted' && existingRow.cells.Tag === Tag,
  );

  if (deletedRowSameTag) {
    deletedRowSameTag.undoDelete();
    deletedRowSameTag.val(data);
  } else {
    ftEA.rows.add(data);
  }
  persistEaTableData(ftEA);

  return true;
}
