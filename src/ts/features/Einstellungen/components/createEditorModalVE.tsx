import Modal from 'bootstrap/js/dist/modal';
import { Fragment, createRef, type FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import { CustomTable, Row } from '../../../infrastructure/table/CustomTable';
import { MyCheckbox, MyFormModal, MyInput, MyModalBody, showModal } from '../../../components';
import type { IVorgabenUvorgabenB } from '../../../core/types';
import { saveTableDataVorgabenU } from '../utils';

type vorgabenBElement = { tag: number; zeit: string; Nwoche?: boolean };

const WEEKDAY_SLOTS: Array<{ tag: number; short: string }> = [
  { tag: 1, short: 'Mo' },
  { tag: 2, short: 'Di' },
  { tag: 3, short: 'Mi' },
  { tag: 4, short: 'Do' },
  { tag: 5, short: 'Fr' },
  { tag: 6, short: 'Sa' },
  { tag: 0, short: 'So' },
];

const SLOT_LOOKUP_BY_TAG: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  0: 6,
};

const getSlotFromTag = (tag: number, Nwoche = false, allowSecondWeek = true): number => {
  const baseIndex = SLOT_LOOKUP_BY_TAG[tag] ?? -1;
  if (baseIndex < 0) return 0;
  if (!allowSecondWeek) return baseIndex;
  return baseIndex + (Nwoche ? 7 : 0);
};

const getTagFromSlot = (slot: number): { tag: number; Nwoche: boolean } => {
  const normalizedSlot = Math.max(0, Math.min(13, slot));
  return {
    tag: WEEKDAY_SLOTS[normalizedSlot % 7].tag,
    Nwoche: normalizedSlot >= 7,
  };
};

const getSlotLabel = (slot: number): string => {
  const normalizedSlot = Math.max(0, Math.min(13, slot));
  const weekLabel = normalizedSlot >= 7 ? 'W2' : 'W1';
  return `${WEEKDAY_SLOTS[normalizedSlot % 7].short} ${weekLabel}`;
};

type WeekdayRangeSelectorProps = {
  startId: string;
  endId: string;
  label: string;
  startHasNwoche: boolean;
  initialStart: vorgabenBElement;
  initialEnd: vorgabenBElement;
};

const WeekdayRangeSelector: FunctionalComponent<WeekdayRangeSelectorProps> = ({
  startId,
  endId,
  label,
  startHasNwoche,
  initialStart,
  initialEnd,
}: WeekdayRangeSelectorProps) => {
  const initialStartSlot =
    startHasNwoche && initialStart.Nwoche && initialStart.tag === 0
      ? getSlotFromTag(initialStart.tag, false, true)
      : getSlotFromTag(initialStart.tag, initialStart.Nwoche, startHasNwoche);
  const initialEndSlot = Math.max(getSlotFromTag(initialEnd.tag, initialEnd.Nwoche, true), initialStartSlot);

  const [startSlot, setStartSlot] = useState<number>(initialStartSlot);
  const [endSlot, setEndSlot] = useState<number | null>(initialEndSlot);
  const [startNwocheState, setStartNwocheState] = useState<boolean>(Boolean(initialStart.Nwoche));
  const [awaitingEndSelection, setAwaitingEndSelection] = useState<boolean>(false);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);

  const updateByTap = (slot: number): void => {
    if (!awaitingEndSelection) {
      const nextStartSlot = startHasNwoche ? slot : slot % 7;
      setStartSlot(nextStartSlot);
      setEndSlot(null);
      if (startHasNwoche) setStartNwocheState(nextStartSlot >= 7);
      setAwaitingEndSelection(true);
      return;
    }

    const nextEndSlot = Math.max(slot, startSlot);
    setEndSlot(nextEndSlot);
    setAwaitingEndSelection(false);
  };

  const handlePointerDown = (event: PointerEvent, slot: number): void => {
    if (event.pointerType === 'mouse') {
      const normalizedAnchor = startHasNwoche ? slot : slot % 7;
      setStartSlot(normalizedAnchor);
      setEndSlot(null);
      if (startHasNwoche) setStartNwocheState(normalizedAnchor >= 7);
      setDragAnchor(normalizedAnchor);
      setAwaitingEndSelection(true);
      return;
    }

    updateByTap(slot);
  };

  const handlePointerEnter = (slot: number): void => {
    if (dragAnchor === null) return;
    const nextStart = Math.min(dragAnchor, slot);
    const nextEnd = Math.max(dragAnchor, slot);
    setStartSlot(nextStart);
    setEndSlot(nextEnd);
    if (startHasNwoche) setStartNwocheState(nextStart >= 7);
  };

  const clearDrag = (): void => {
    if (dragAnchor !== null) {
      setDragAnchor(null);
      if (endSlot !== null) setAwaitingEndSelection(false);
    }
  };

  const startValue = getTagFromSlot(startSlot);
  const resolvedEndSlot = endSlot ?? startSlot;
  const endValue = getTagFromSlot(resolvedEndSlot);
  const inRangeText =
    endSlot === null ? `${getSlotLabel(startSlot)} -> ...` : `${getSlotLabel(startSlot)} -> ${getSlotLabel(endSlot)}`;

  return (
    <div className="col-12">
      <div className="d-flex flex-wrap gap-2 align-items-baseline mb-2">
        <span className="fw-semibold">{label}</span>
        <span className="small text-body-secondary">Auswahl: {inRangeText}</span>
      </div>
      <div
        className="d-grid"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.375rem' }}
        onPointerUp={clearDrag}
        onPointerLeave={clearDrag}
      >
        {Array.from({ length: 14 }, (_, slot) => {
          const isStart = slot === startSlot;
          const isEnd = endSlot !== null && slot === endSlot;
          const isInRange = endSlot === null ? slot === startSlot : slot >= startSlot && slot <= endSlot;

          const variantClass = isStart
            ? 'btn-success'
            : isEnd
              ? 'btn-info'
              : isInRange
                ? 'btn-primary'
                : 'btn-outline-secondary';

          return (
            <button
              key={`${startId}-${slot}`}
              type="button"
              className={`btn btn-sm ${variantClass} py-2`}
              onPointerDown={event => handlePointerDown(event, slot)}
              onPointerEnter={() => handlePointerEnter(slot)}
              onClick={() => updateByTap(slot)}
              aria-pressed={isStart || isEnd || isInRange}
            >
              {WEEKDAY_SLOTS[slot % 7].short}
            </button>
          );
        })}
      </div>

      <input type="hidden" id={`${startId}Tag`} value={startValue.tag} />
      <input type="hidden" id={`${endId}Tag`} value={endValue.tag} />
      {startHasNwoche ? (
        <input type="checkbox" id={`${startId}Nwoche`} checked={startNwocheState} hidden readOnly />
      ) : null}
      <input type="checkbox" id={`${endId}Nwoche`} checked={endValue.Nwoche} hidden readOnly />
    </div>
  );
};

const createNameElement = (row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>) => {
  const column = row.columns.array.find(column => column.name === 'Name');
  if (!column) throw Error(`Spalte "Name" nicht gefunden`);

  const value: string = row instanceof Row ? (row.cells[column.name] as string) : '';

  return (
    <MyInput
      divClass="form-floating col-12 pb-3"
      required
      type={column.type}
      id={column.name}
      name={column.title}
      value={value}
    >
      {column.title}
    </MyInput>
  );
};
const createcheckboxElement = (
  row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
  columnName: string,
) => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);

  const isChecked: boolean = row instanceof Row ? (row.cells?.[column.name] as boolean) : false;

  return (
    <MyCheckbox className="form-check form-switch col-12 pb-3" id={column.name} checked={isChecked}>
      {column.title}
    </MyCheckbox>
  );
};

const createTimeElement = (row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>, columnName: string) => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);

  const inputValue: string = row instanceof Row ? (row.cells?.[column.name] as vorgabenBElement).zeit : '';

  return (
    <MyInput
      divClass="form-floating col-6"
      required
      type="time"
      id={`${column.name}Zeit`}
      name={column.title}
      value={inputValue}
    >
      {column.title}
    </MyInput>
  );
};

const createRangeElement = (
  row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
  startColumnName: string,
  endColumnName: string,
  startHasNwoche: boolean,
  label: string,
) => {
  const startColumn = row.columns.array.find(column => column.name === startColumnName);
  const endColumn = row.columns.array.find(column => column.name === endColumnName);
  if (!startColumn || !endColumn) throw Error(`Spalten ${startColumnName}/${endColumnName} nicht gefunden`);

  const startValue: vorgabenBElement =
    row instanceof Row ? (row.cells?.[startColumn.name] as vorgabenBElement) : { tag: 1, zeit: '' };
  const endValue: vorgabenBElement =
    row instanceof Row ? (row.cells?.[endColumn.name] as vorgabenBElement) : { tag: 5, zeit: '', Nwoche: false };

  return (
    <Fragment>
      <WeekdayRangeSelector
        startId={startColumn.name}
        endId={endColumn.name}
        label={label}
        startHasNwoche={startHasNwoche}
        initialStart={startValue}
        initialEnd={endValue}
      />
      <div className="row g-2 mt-2 pb-3">
        {createTimeElement(row, startColumnName)}
        {createTimeElement(row, endColumnName)}
      </div>
    </Fragment>
  );
};

export default function EditorModalVE(
  row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
  titel: string,
): void {
  const ref = createRef<HTMLFormElement>();
  const isNachtInitiallyChecked: boolean = row instanceof Row ? Boolean(row.cells?.nacht) : false;

  const modal = showModal<IVorgabenUvorgabenB>(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {createNameElement(row)}
        {createcheckboxElement(row, 'standard')}
        <hr />
        {createRangeElement(row, 'beginnB', 'endeB', false, 'Bereitschaft')}
        <hr />
        {createcheckboxElement(row, 'nacht')}
        <div id="nachtRangeSection" className={isNachtInitiallyChecked ? '' : 'd-none'}>
          {createRangeElement(row, 'beginnN', 'endeN', true, 'Nachtschicht')}
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  const nachtCheckbox = form.querySelector<HTMLInputElement>('#nacht');
  const nachtRangeSection = form.querySelector<HTMLDivElement>('#nachtRangeSection');
  const toggleNachtSection = (): void => {
    if (!nachtRangeSection || !nachtCheckbox) return;
    const isNachtEnabled = nachtCheckbox.checked;
    nachtRangeSection.classList.toggle('d-none', !isNachtEnabled);

    const nachtZeitInputs = nachtRangeSection.querySelectorAll<HTMLInputElement>('input[type="time"]');
    nachtZeitInputs.forEach(input => {
      input.disabled = !isNachtEnabled;
      input.required = isNachtEnabled;
    });
  };
  toggleNachtSection();
  nachtCheckbox?.addEventListener('change', toggleNachtSection);

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table: CustomTable<IVorgabenUvorgabenB> = row instanceof Row ? row.CustomTable : row;

      const beginnBTag = Number(form.querySelector<HTMLInputElement>('#beginnBTag')?.value ?? NaN);
      const endeBTag = Number(form.querySelector<HTMLInputElement>('#endeBTag')?.value ?? NaN);
      const beginnNTag = Number(form.querySelector<HTMLInputElement>('#beginnNTag')?.value ?? NaN);
      const endeNTag = Number(form.querySelector<HTMLInputElement>('#endeNTag')?.value ?? NaN);
      const endeBNwoche = form.querySelector<HTMLInputElement>('#endeBNwoche')?.checked ?? false;
      const beginnNNwoche = form.querySelector<HTMLInputElement>('#beginnNNwoche')?.checked ?? false;
      const endeNNwoche = form.querySelector<HTMLInputElement>('#endeNNwoche')?.checked ?? false;
      const beginnBZeit = form.querySelector<HTMLInputElement>('#beginnBZeit')?.value ?? '';
      const endeBZeit = form.querySelector<HTMLInputElement>('#endeBZeit')?.value ?? '';
      const beginnNZeit = form.querySelector<HTMLInputElement>('#beginnNZeit')?.value ?? '';
      const endeNZeit = form.querySelector<HTMLInputElement>('#endeNZeit')?.value ?? '';
      const nameN = form.querySelector<HTMLInputElement>('#Name')?.value ?? '';
      const nacht = form.querySelector<HTMLInputElement>('#nacht')?.checked ?? false;
      const standard = form.querySelector<HTMLInputElement>('#standard')?.checked ?? false;

      const values: IVorgabenUvorgabenB = {
        Name: nameN,
        beginnB: { tag: beginnBTag, zeit: beginnBZeit },
        endeB: { tag: endeBTag, zeit: endeBZeit, Nwoche: endeBNwoche },
        nacht: nacht,
        beginnN: nacht
          ? { tag: beginnNTag, zeit: beginnNZeit, Nwoche: beginnNNwoche }
          : { tag: beginnBTag, zeit: beginnBZeit, Nwoche: false },
        endeN: nacht
          ? { tag: endeNTag, zeit: endeNZeit, Nwoche: endeNNwoche }
          : { tag: endeBTag, zeit: endeBZeit, Nwoche: endeBNwoche },
        standard: standard ? true : undefined,
      };
      if (standard) {
        let ft: CustomTable<IVorgabenUvorgabenB>;
        let newStandard: Row<IVorgabenUvorgabenB> | null;
        if (row instanceof Row) [ft, newStandard] = [row.CustomTable, row];
        else if (row instanceof CustomTable) [ft, newStandard] = [row, null];
        else throw new Error('CustomTable nicht gefunden');
        setStandard(ft, newStandard);
      }
      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      saveTableDataVorgabenU(table);
    };
    function setStandard(ft: CustomTable<IVorgabenUvorgabenB>, newStandard: Row<IVorgabenUvorgabenB> | null): void {
      const rows = ft.getRows();

      for (const key in rows) {
        const value = rows[key].cells;
        if (newStandard && newStandard === rows[key]) {
          value.standard = true;
          rows[key].val(value);
        } else if (value.standard) {
          delete value.standard;
          rows[key].val(value);
        }
      }
    }
  }
}
