import { createRef } from 'preact';
import type { CustomTable } from '../../../class/CustomTable';
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '../../../components';
import type { IDatenEWT } from '../../../interfaces';
import { type IVorgabenU, type IVorgabenUfZ } from '../../../interfaces';
import { default as Storage } from '../../../infrastructure/storage/Storage';
import dayjs from '../../../infrastructure/date/configDayjs';
import { addEwtTag, calculateBuchungstagEwt, calculateEwtEintraege, setNaechsterEwtTag } from '../utils';

export default function createAddModalEWT(tableE: CustomTable<IDatenEWT>): void {
  const ref = createRef<HTMLFormElement>();

  const vorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });

  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const Monat: number = Storage.get<number>('Monat', { check: true });
  const datum = dayjs([Jahr, Monat - 1, 1]);
  const maxDate = datum.endOf('month').format('YYYY-MM-DD');

  const berechnenRef = createRef<HTMLInputElement>();
  const bueroRef = createRef<HTMLInputElement>();
  const EOrtRef = createRef<HTMLSelectElement>();
  const SchichtRef = createRef<HTMLSelectElement>();
  const buchungstagHinweisRef = createRef<HTMLDivElement>();
  const buchungstagHinweisTextRef = createRef<HTMLInputElement>();

  const updateBuchungstagAnzeige = () => {
    const tagInput = document.querySelector<HTMLInputElement>('#tagE');
    if (!tagInput || !EOrtRef.current || !SchichtRef.current || !berechnenRef.current || !bueroRef.current) {
      return;
    }

    const tagE = tagInput.value;
    if (!tagE) {
      if (buchungstagHinweisRef.current) {
        buchungstagHinweisRef.current.classList.add('d-none');
      }
      return;
    }

    let data: IDatenEWT = {
      tagE,
      buchungstagE: tagE,
      eOrtE: EOrtRef.current.value,
      schichtE: SchichtRef.current.value,
      abWE: '',
      ab1E: '',
      anEE: '',
      beginE: '',
      endeE: '',
      abEE: '',
      an1E: '',
      anWE: '',
      berechnen: berechnenRef.current.checked,
    };

    if (bueroRef.current.checked) {
      data.berechnen = true;
      data = calculateEwtEintraege(vorgabenU, [data])[0];
      data = { ...data, ...{ ab1E: '', anEE: '', abEE: '', an1E: '', berechnen: false } };
    } else {
      data = calculateEwtEintraege(vorgabenU, [data])[0];
    }

    const buchungstag = calculateBuchungstagEwt(data);
    const istAbweichend = !dayjs(buchungstag).isSame(dayjs(tagE), 'day');

    if (!buchungstagHinweisRef.current) return;
    if (istAbweichend) {
      if (buchungstagHinweisTextRef.current) {
        buchungstagHinweisTextRef.current.value = dayjs(buchungstag).format('YYYY-MM-DD');
      }
      buchungstagHinweisRef.current.classList.remove('d-none');
      return;
    }

    buchungstagHinweisRef.current.classList.add('d-none');
  };

  const changeBuero = (event: Event) => {
    event.stopPropagation();
    if (!berechnenRef.current || !EOrtRef.current || !SchichtRef.current) return;
    const target = event.currentTarget as HTMLInputElement | null;
    if (target) {
      berechnenRef.current.checked = !target.checked;
      if (target.checked) {
        const EOrt = EOrtRef.current;
        const index = Array.from(EOrt.options).findIndex(option => option.value === vorgabenU.pers.ErsteTkgSt);
        EOrt.selectedIndex = index !== -1 ? index : 0;

        SchichtRef.current.selectedIndex = 0;
      }
    }
    updateBuchungstagAnzeige();
  };

  const modal = showModal<IDatenEWT>(
    <MyFormModal myRef={ref} size="sm" title="Neue Anwesenheit eingeben" onSubmit={onSubmit()}>
      <MyModalBody>
        <div>
          <MyButton
            className="btn btn-secondary btn-lg text-start col-12"
            id="btnNaechsterTag"
            clickHandler={(e: MouseEvent) => {
              e.preventDefault();
              setNaechsterEwtTag();
              updateBuchungstagAnzeige();
            }}
            text="+1 Tag"
            ariaLabel="Nächster Tag"
          />
        </div>
        <MyInput required type="date" id="tagE" name="Tag" min={datum.format('YYYY-MM-DD')} max={maxDate}>
          Tag
        </MyInput>
        <div ref={buchungstagHinweisRef} id="buchungstagHinweis" className="form-floating col-12 d-none">
          <MyInput
            type="date"
            myRef={buchungstagHinweisTextRef}
            id="buchungstagE"
            name="Buchungstag"
            value={datum.format('YYYY-MM-DD')}
            disabled
          >
            Buchungstag
          </MyInput>
        </div>
        <MySelect
          className="form-floating"
          title="Einsatzort"
          id="EOrt"
          myRef={EOrtRef}
          options={[
            { text: '', selected: true },
            ...vorgabenU.fZ.map((ort: IVorgabenUfZ) => {
              return {
                value: ort.key,
                text: ort.key,
              };
            }),
          ]}
        />
        <MySelect
          className="form-floating"
          title="Schicht"
          id="Schicht"
          required
          myRef={SchichtRef}
          options={[
            {
              value: 'T',
              text: `Tag | ${vorgabenU.aZ.bT.toString()}-${vorgabenU.aZ.eT.toString()}/${vorgabenU.aZ.eTF.toString()}`,
              selected: true,
            },
            { value: 'N', text: `Nacht | ${vorgabenU.aZ.bN.toString()}-${vorgabenU.aZ.eN.toString()}` },
            { value: 'BN', text: `Nacht (Ber) | ${vorgabenU.aZ.bBN.toString()}-${vorgabenU.aZ.eN.toString()}` },
            { value: 'S', text: `Sonder | ${vorgabenU.aZ.bS.toString()}-${vorgabenU.aZ.eS.toString()}` },
          ]}
        />
        <MyCheckbox className="form-check form-switch mt-3" id="berechnen1" myRef={berechnenRef} checked>
          Berechnen
        </MyCheckbox>
        <MyCheckbox
          className="form-check form-switch mt-3"
          id="berechnen2"
          changeHandler={changeBuero}
          myRef={bueroRef}
        >
          Büro
          <br />
          <small>(Keine Fahrt zu einem Einsatzort)</small>
        </MyCheckbox>
      </MyModalBody>
    </MyFormModal>,
  );

  setNaechsterEwtTag('');

  if (ref.current === null || bueroRef.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;
  const bueroCheckbox = bueroRef.current;

  document.querySelector<HTMLInputElement>('#tagE')?.addEventListener('change', updateBuchungstagAnzeige);
  EOrtRef.current?.addEventListener('change', updateBuchungstagAnzeige);
  SchichtRef.current?.addEventListener('change', updateBuchungstagAnzeige);
  berechnenRef.current?.addEventListener('change', updateBuchungstagAnzeige);

  updateBuchungstagAnzeige();

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      addEwtTag(modal, vorgabenU, bueroCheckbox.checked, tableE);
    };
  }
}
