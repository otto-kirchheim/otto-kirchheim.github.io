import Modal from 'bootstrap/js/dist/modal';
import type { Dayjs } from 'dayjs';
import type { ComponentChildren } from 'preact';
import { Fragment, createRef } from 'preact';
import { CustomTable, Row } from '../../class/CustomTable';
import { createSnackBar } from '../../class/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '../../components';
import type { CustomHTMLDivElement, IDatenBE } from '../../interfaces';
import { Storage, checkMaxTag } from '../../utilities';
import dayjs from '../../utilities/configDayjs';
import {
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  isSameBereitschaftsEinsatz,
  persistBereitschaftsEinsatzTableData,
} from '../utils';

const createElements = (row: CustomTable<IDatenBE> | Row<IDatenBE>, datum: Dayjs): ComponentChildren => {
  return row.columns.array.map(column => {
    switch (column.name) {
      case 'tagBE':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6 pb-3"
            type="date"
            id={column.name}
            name={column.title}
            required
            min={datum.startOf('M').format('YYYY-MM-DD')}
            max={datum.endOf('M').format('YYYY-MM-DD')}
            value={datum.format('YYYY-MM-DD')}
          >
            {column.title}
          </MyInput>
        );
      case 'auftragsnummerBE':
        return (
          <MyInput
            divClass="form-floating col-12 pb-3"
            type="text"
            id={column.name}
            name={column.longTitle}
            required
            min={datum.startOf('M').format('YYYY-MM-DD')}
            max={datum.endOf('M').format('YYYY-MM-DD')}
            value={row instanceof Row ? row.cells[column.name] : ''}
          >
            {column.longTitle}
          </MyInput>
        );
      case 'beginBE':
      case 'endeBE':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6 pb-3"
            type="time"
            id={column.name}
            name={column.title}
            required
            value={row instanceof Row ? row.cells[column.name] : ''}
          >
            {column.title}
          </MyInput>
        );
      case 'lreBE':
        return (
          <Fragment>
            <MySelect
              className="form-floating col-12 col-sm-6 pb-3"
              id={column.name}
              title={column.title}
              required
              value={row instanceof Row ? row.cells[column.name] : ''}
              options={[
                { text: 'Bitte Einsatz auswählen', disabled: true, selected: true },
                { value: 'LRE 1', text: 'LRE 1' },
                { value: 'LRE 2', text: 'LRE 2' },
                { value: 'LRE 1/2 ohne x', text: 'LRE 1/2 ohne x' },
                { value: 'LRE 3', text: 'LRE 3' },
                { value: 'LRE 3 ohne x', text: 'LRE 3 ohne x' },
              ]}
            />
          </Fragment>
        );
      case 'privatkmBE':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6"
            type="number"
            id={column.name}
            name={column.longTitle}
            min={'0'}
            value={row instanceof Row ? row.cells[column.name] : ''}
            popover={{
              title: column.longTitle,
              content:
                'Nur angeben, wenn im Einsatzverlauf mit einem privaten Fahrzeug gefahren wurde. Und kein Dienstwagen zur Verfügung stand.',
              placement: 'top',
              trigger: 'focus',
            }}
          >
            {column.longTitle}
          </MyInput>
        );
      default:
        return;
    }
  });
};

export default function EditorModalBE(row: CustomTable<IDatenBE> | Row<IDatenBE>, titel: string): void {
  const ref = createRef<HTMLFormElement>();

  let datum: dayjs.Dayjs;
  if (row instanceof Row) {
    datum = dayjs(row.cells.tagBE, 'DD.MM.YYYY');
  } else if (row instanceof CustomTable) {
    const Monat: number = Storage.get<number>('Monat', { check: true });
    const Jahr: number = Storage.get<number>('Jahr', { check: true });
    datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
  } else throw new Error('unbekannter Fehler');

  const modal: CustomHTMLDivElement<IDatenBE> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>{createElements(row, datum)}</MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table: CustomTable<IDatenBE> = row instanceof Row ? row.CustomTable : row;
      const currentBe = row instanceof Row ? row.cells : undefined;

      const values: IDatenBE = {
        _id: row instanceof Row ? row.cells._id : undefined,
        bereitschaftszeitraumBE: row instanceof Row ? row.cells.bereitschaftszeitraumBE : undefined,
        tagBE: dayjs(form.querySelector<HTMLInputElement>('#tagBE')?.value).format('DD.MM.YYYY') ?? '',
        auftragsnummerBE: form.querySelector<HTMLInputElement>('#auftragsnummerBE')?.value ?? '',
        beginBE: form.querySelector<HTMLInputElement>('#beginBE')?.value ?? '',
        endeBE: form.querySelector<HTMLInputElement>('#endeBE')?.value ?? '',
        lreBE: (form.querySelector<HTMLSelectElement>('#lreBE')?.value as IDatenBE['lreBE']) ?? '',
        privatkmBE: Number(form.querySelector<HTMLInputElement>('#privatkmBE')?.value ?? 0),
      };

      const einsatzDate = dayjs(values.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
      const einsatzStart = dayjs(`${einsatzDate}T${values.beginBE}`);
      const einsatzEndRaw = dayjs(`${einsatzDate}T${values.endeBE}`);
      const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');

      const bzData = getBereitschaftsZeitraumDaten();
      const startBz = bzData.find(bz => {
        const bzStart = dayjs(String(bz.beginB));
        const bzEnd = dayjs(String(bz.endeB));
        return einsatzStart.isSameOrAfter(bzStart) && einsatzStart.isSameOrBefore(bzEnd);
      });

      const endBz = bzData.find(bz => {
        const bzStart = dayjs(String(bz.beginB));
        const bzEnd = dayjs(String(bz.endeB));
        return einsatzEnd.isSameOrAfter(bzStart) && einsatzEnd.isSameOrBefore(bzEnd);
      });

      if (!startBz || !endBz) {
        createSnackBar({
          message:
            'Bereitschaft<br/>Kein passender Bereitschaftszeitraum für den geänderten Einsatz gefunden.<br/>Bitte Zeitraum anpassen oder neu anlegen.',
          status: 'warning',
          timeout: 4500,
          fixed: true,
        });
        return;
      }

      if (startBz !== endBz) {
        const endOfStartBz = dayjs(String(startBz.endeB));
        const startOfEndBz = dayjs(String(endBz.beginB));
        if (!endOfStartBz.isSame(startOfEndBz)) {
          createSnackBar({
            message:
              'Bereitschaft<br/>Der Einsatz liegt in einer Lücke zwischen zwei Bereitschaftszeiträumen.<br/>Bitte Zeiträume anpassen.',
            status: 'warning',
            timeout: 4500,
            fixed: true,
          });
          return;
        }
      }

      if (!startBz._id) {
        createSnackBar({
          message:
            'Bereitschaft<br/>Der passende Bereitschaftszeitraum ist noch nicht gespeichert.<br/>Bitte zuerst Zeiträume speichern.',
          status: 'warning',
          timeout: 4500,
          fixed: true,
        });
        return;
      }

      values.bereitschaftszeitraumBE = startBz._id;

      const overlapsExistingBe = getBereitschaftsEinsatzDaten().some(be => {
        if (isSameBereitschaftsEinsatz(be, currentBe)) return false;
        const existingDate = dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
        const existingStart = dayjs(`${existingDate}T${be.beginBE}`);
        const existingEndRaw = dayjs(`${existingDate}T${be.endeBE}`);
        const existingEnd = existingEndRaw.isAfter(existingStart) ? existingEndRaw : existingEndRaw.add(1, 'day');
        return einsatzStart.isBefore(existingEnd) && existingStart.isBefore(einsatzEnd);
      });

      if (overlapsExistingBe) {
        createSnackBar({
          message: 'Bereitschaft<br/>Bereitschaftseinsätze dürfen sich nicht überschneiden.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (values.lreBE === 'LRE 1') {
        const hasOtherLre1InSameBz = getBereitschaftsEinsatzDaten().some(be => {
          if (be.lreBE !== 'LRE 1') return false;
          if (isSameBereitschaftsEinsatz(be, currentBe)) return false;

          const existingDate = dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
          const existingStart = dayjs(`${existingDate}T${be.beginBE}`);
          const existingEndRaw = dayjs(`${existingDate}T${be.endeBE}`);
          const existingEnd = existingEndRaw.isAfter(existingStart) ? existingEndRaw : existingEndRaw.add(1, 'day');

          const bzStart = dayjs(String(startBz.beginB));
          const bzEnd = dayjs(String(startBz.endeB));
          return existingStart.isSameOrAfter(bzStart) && existingEnd.isSameOrBefore(bzEnd);
        });

        if (hasOtherLre1InSameBz) {
          createSnackBar({
            message: 'Bereitschaft<br/>Hinweis: Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.',
            status: 'warning',
            timeout: 4000,
            fixed: true,
          });
        }
      }

      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      persistBereitschaftsEinsatzTableData(table);
    };
  }
}
