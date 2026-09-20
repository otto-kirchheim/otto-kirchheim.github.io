import type { CustomTable } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from '@/types';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import dayjs from '@/infrastructure/date/configDayjs';
import { calculateBuchungstagEwt, calculateEwtEintraege, setNaechsterEwtTag, persistEwtTableData } from '.';

/**
 * Legt aus den Feldern des Add-Modals einen EWT-Eintrag an (Zeiten aus den Vorgaben berechnet),
 * persistiert die Tabelle und setzt den Tag im Modal auf den nächsten Tag. Identische Einträge werden
 * abgelehnt; eine gelöschte Zeile desselben Tages wird wiederhergestellt statt neu angelegt.
 *
 * @param modal - Add-Modal mit den Feldern `#Tag`, `#EOrt`, `#Schicht` und `#berechnen1`.
 * @param vorgabenU - Persönliche Vorgaben für die Zeitberechnung.
 * @param berechneBuero - Bürotag (keine Fahrt zu einem Einsatzort): Zeiten werden berechnet, `ab1E`/`anEE`/`abEE`/`an1E` danach geleert und `berechnen` ausgeschaltet.
 * @param tableE - EWT-Tabelle, in die eingefügt wird.
 * @throws {Error} Wenn ein Pflichtfeld im Modal fehlt.
 */
export default function addEwtTag(
  modal: CustomHTMLDivElement<IDatenEWT>,
  vorgabenU: IVorgabenU,
  berechneBuero: boolean = false,
  tableE: CustomTable<IDatenEWT>,
): void {
  const tagEInput = modal.querySelector<HTMLInputElement>('#Tag');
  const eOrtESelect = modal.querySelector<HTMLSelectElement>('#EOrt');
  const schichtESelect = modal.querySelector<HTMLSelectElement>('#Schicht');
  const berechnenInput = modal.querySelector<HTMLInputElement>('#berechnen1');

  if (!tagEInput) throw new Error('TagE input not found');
  if (!eOrtESelect) throw new Error('EOrt select not found');
  if (!schichtESelect) throw new Error('Schicht select not found');
  if (!berechnenInput) throw new Error('Berechnen input not found');

  const Tag = tagEInput.value;
  const Einsatzort = eOrtESelect.value;
  const Schicht = schichtESelect.value;
  const berechnen = berechnenInput.checked;

  let data: IDatenEWT = {
    Tag,
    Buchungstag: Tag,
    Einsatzort,
    Schicht,
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
  data.Buchungstag = calculateBuchungstagEwt(data);

  const ftE = tableE;

  const hasExactDuplicate = ftE.rows.array.some(existingRow => {
    if (existingRow._state === 'deleted') return false;
    const existing = existingRow.cells;
    return (
      existing.Tag === data.Tag &&
      existing.Einsatzort === data.Einsatzort &&
      existing.Schicht === data.Schicht &&
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

  // Einen zum Löschen vorgemerkten Eintrag desselben Tages reaktivieren, damit er als Update statt
  // als Delete+Create erhalten bleibt.
  const deletedRowSameTag = ftE.rows.array.find(
    existingRow => existingRow._state === 'deleted' && existingRow.cells.Tag === data.Tag,
  );

  if (deletedRowSameTag) {
    deletedRowSameTag.undoDelete();
    deletedRowSameTag.val(data);
  } else {
    ftE.rows.add(data);
  }
  persistEwtTableData(ftE);

  const existingRows: IDatenEWT[] = ftE.getRows().map(row => row.cells);
  setNaechsterEwtTag(dayjs(Tag).date(), existingRows);

  // Change-Event, damit das Add-Modal z. B. den Buchungstag-Hinweis neu berechnet.
  tagEInput.dispatchEvent(new Event('change', { bubbles: true }));
}
