import { createRef, type ChangeEvent, type MouseEvent, type SubmitEvent } from 'react';

import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import type { IDatenEWT } from '@/types';
import { type IVorgabenU, type IVorgabenUfZ } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { addEwtTag, calculateBuchungstagEwt, calculateEwtEintraege, setNaechsterEwtTag } from '../utils';

function buildSchichtOptionen(vorgabenU: IVorgabenU): { value: string; text: string; selected?: boolean }[] {
  const { Arbeitszeit: aZ } = vorgabenU;
  const freitagEnde = aZ.frueh.overrides?.[5]?.ende;
  const fruehLabel = freitagEnde
    ? `Früh | ${aZ.frueh.default.beginn}–${aZ.frueh.default.ende} / Fr: ${freitagEnde}`
    : `Früh | ${aZ.frueh.default.beginn}–${aZ.frueh.default.ende}`;

  return [
    { value: 'T', text: fruehLabel, selected: true },
    ...(aZ.spaet.aktiv ? [{ value: 'SP', text: `Spät | ${aZ.spaet.default.beginn}–${aZ.spaet.default.ende}` }] : []),
    ...(aZ.nacht.aktiv ? [{ value: 'N', text: `Nacht | ${aZ.nacht.default.beginn}–${aZ.nacht.default.ende}` }] : []),
    ...(aZ.sonder.aktiv ? [{ value: 'S', text: `Sonder | ${aZ.sonder.beginn}–${aZ.sonder.ende}` }] : []),
  ];
}

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
    const tagInput = document.querySelector<HTMLInputElement>('#Tag');
    if (!tagInput || !EOrtRef.current || !SchichtRef.current || !berechnenRef.current || !bueroRef.current) {
      return;
    }

    const Tag = tagInput.value;
    if (!Tag) {
      if (buchungstagHinweisRef.current) {
        buchungstagHinweisRef.current.classList.add('d-none');
      }
      return;
    }

    let data: IDatenEWT = {
      Tag,
      Buchungstag: Tag,
      Einsatzort: EOrtRef.current.value,
      Schicht: SchichtRef.current.value,
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
    const istAbweichend = !dayjs(buchungstag).isSame(dayjs(Tag), 'day');

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

  const changeBuero = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (!berechnenRef.current || !EOrtRef.current || !SchichtRef.current) return;
    const target = event.currentTarget as HTMLInputElement | null;
    if (target) {
      berechnenRef.current.checked = !target.checked;
      if (target.checked) {
        const EOrt = EOrtRef.current;
        const index = Array.from(EOrt.options).findIndex(option => option.value === vorgabenU.Pers.ErsteTkgSt);
        EOrt.selectedIndex = index !== -1 ? index : 0;

        SchichtRef.current.selectedIndex = 0;
      }
    }
    updateBuchungstagAnzeige();
  };

  const modal = showModal<IDatenEWT>(
    <MyFormModal myRef={ref} title="Neue Anwesenheit eingeben" helpContext="modal.ewt.add" onSubmit={onSubmit()}>
      <MyModalBody>
        <div className="">
          <MyButton
            className="btn btn-secondary btn-lg text-start w-100"
            id="btnNaechsterTag"
            clickHandler={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              setNaechsterEwtTag();
              updateBuchungstagAnzeige();
            }}
            text="+1 Tag"
            ariaLabel="Nächster Tag"
          />
        </div>
        <MyInput
          divClass="form-floating col-12"
          required
          type="date"
          id="Tag"
          name="Tag"
          min={datum.format('YYYY-MM-DD')}
          max={maxDate}
        >
          Tag
        </MyInput>
        <div ref={buchungstagHinweisRef} id="buchungstagHinweis" className="d-none">
          <MyInput
            type="date"
            myRef={buchungstagHinweisTextRef}
            id="Buchungstag"
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
            ...vorgabenU.Fahrzeit.map((ort: IVorgabenUfZ) => {
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
          options={buildSchichtOptionen(vorgabenU)}
        />
        <div className="">
          <MyCheckbox className="form-check form-switch" id="berechnen1" myRef={berechnenRef} checked>
            Berechnen
          </MyCheckbox>
        </div>
        <div className="">
          <MyCheckbox className="form-check form-switch" id="berechnen2" changeHandler={changeBuero} myRef={bueroRef}>
            Büro
            <br />
            <small>(Keine Fahrt zu einem Einsatzort)</small>
          </MyCheckbox>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  setNaechsterEwtTag('');

  if (ref.current === null || bueroRef.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;
  const bueroCheckbox = bueroRef.current;

  document.querySelector<HTMLInputElement>('#Tag')?.addEventListener('change', updateBuchungstagAnzeige);
  EOrtRef.current?.addEventListener('change', updateBuchungstagAnzeige);
  SchichtRef.current?.addEventListener('change', updateBuchungstagAnzeige);
  berechnenRef.current?.addEventListener('change', updateBuchungstagAnzeige);

  updateBuchungstagAnzeige();

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      addEwtTag(modal, vorgabenU, bueroCheckbox.checked, tableE);
    };
  }
}
