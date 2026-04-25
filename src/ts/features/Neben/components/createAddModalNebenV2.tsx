import { createRef } from 'preact';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyButton, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import { getEwtDaten } from '../../EWT/utils';
import type { CustomHTMLTableElement, IDatenEWT, IDatenN } from '@/types';
import dayjs from '@/infrastructure/date/configDayjs';
import { addNebengeldTag, getNebengeldDaten } from '../utils';

type ReturnTypeTagOptions = {
  value: string | number;
  text: string;
  disabled?: boolean;
  selected?: boolean;
};

const getTagOptions = (dataE: IDatenEWT[]): ReturnTypeTagOptions[] => {
  const dataN = getNebengeldDaten(undefined, undefined, { scope: 'monat' });

  const options = dataE
    .map(day => {
      const schicht = day.schichtE;
      const tagEDate = dayjs(day.tagE);
      const tag = tagEDate.format('DD | dd');

      const option: ReturnTypeTagOptions = {
        text: '',
        value: JSON.stringify({
          tagN: tagEDate.format('DD.MM.YYYY'),
          beginN: day.beginE,
          endeN: day.endeE,
          anzahl040N: 1,
          auftragN: '',
          ewtRef: day._id,
        }),
      };

      switch (schicht) {
        case 'N':
          option.text = `${tag} | Nacht`;
          break;
        case 'BN':
          option.text = `${tag} | Nacht / Bereitschaft`;
          break;
        default:
          option.text = tag;
          break;
      }

      if (
        dataN?.some(value => {
          const nebenTagDate = dayjs(value.tagN, 'DD.MM.YYYY');
          return nebenTagDate.isValid() && nebenTagDate.isSame(tagEDate, 'day');
        })
      )
        option.disabled = true;

      return option;
    })
    .filter((option, index, self) => !self.slice(0, index).some(other => other.text === option.text));

  return options;
};

export default function createAddModalNeben(tableN: CustomTable<IDatenN>): void {
  const ref = createRef<HTMLFormElement>();

  const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag' });
  if (dataE.length === 0) {
    createSnackBar({
      message:
        'Keine Tage im aktuellen Monat in EWT gefunden. </br></br>Bitte erst EWT ausfüllen! </br>oder Manuell über "Neue Zeile"',
      timeout: 3000,
      fixed: true,
    });
    throw new Error('Keine Tage im aktuellen Monat in EWT gefunden.');
  }

  const customFooterButton = [
    <MyButton
      key="Manuell"
      className="btn btn-info"
      type="button"
      dataBsDismiss="modal"
      text="Manuell"
      clickHandler={() => {
        const table = document.querySelector<CustomHTMLTableElement<IDatenN>>('#tableN');
        if (!table) throw new Error('table N nicht gefunden');

        table.instance.options.editing.addRow();
      }}
    />,
  ];

  showModal(
    <MyFormModal myRef={ref} title="Neuen Nebenbezug eingeben" onSubmit={onSubmit()} customButtons={customFooterButton}>
      <MyModalBody className=" ">
        <p className="text-center text-bg-warning p-1">!!! Erst EWT Eingeben und Berechnen !!!</p>
        <MySelect
          className="form-floating col mb-3"
          title="Tag (Aus EWT)"
          id="tagN"
          required
          options={getTagOptions(dataE)}
        />
        <MyInput
          divClass="form-floating col mb-3"
          type="text"
          id="AuftragN"
          name="Auftragsnummer"
          minLength={9}
          maxLength={9}
          required
        >
          Auftragsnummer
        </MyInput>
        {/* TODO: Auswahl der Zulagen ja nach Einstellungen in VorgabenU anpassen, ggf. auch Sortiert nach Typ (z.B.
        Fahrentschädigung oder Erschwerniszulage) */}
        <MyInput
          divClass="form-floating col"
          type="number"
          id="anzahl040N"
          name="040 Fahrentschädigung"
          required
          value={1}
          min={'1'}
          max={'1'}
        >
          040 Fahrentschädigung
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();
      addNebengeldTag(form, tableN);
    };
  }
}
