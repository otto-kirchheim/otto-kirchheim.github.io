import Modal from "bootstrap/js/dist/modal";
import { createRef } from "preact";
import { BereitschaftsEinsatzZeiträume } from "..";
import { MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type {
	CustomHTMLDivElement,
	CustomHTMLTableElement,
	IDatenBZ,
	IVorgabenU,
	IVorgabenUvorgabenB,
} from "../../interfaces";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import {
	BerVorgabeAEndern,
	BerZeitenEingabe,
	datumAnpassen,
	eigeneWerte,
	nachtAusblenden,
	saveTableDataBZ,
} from "../utils";

const createDateInputElement = (id: string, name: string, date: dayjs.Dayjs, min: dayjs.Dayjs, max: dayjs.Dayjs) => (
	<MyInput
		divClass="form-floating col-7 col-sm-6 pb-3"
		required
		disabled
		type="Date"
		id={id}
		name={name}
		min={min.format("YYYY-MM-DD")}
		max={max.format("YYYY-MM-DD")}
		value={date.format("YYYY-MM-DD")}
	>
		{name}
	</MyInput>
);

const createTimeInputElement = (id: string, name: string, time: string) => (
	<MyInput divClass="form-floating col-5 col-sm-6 pb-3" required disabled type="time" id={id} name={name} value={time}>
		{name}
	</MyInput>
);

export default function createAddModalBereitschaftsZeit(): void {
	const formRef = createRef<HTMLFormElement>();

	const vorgabenU = Storage.get<Partial<IVorgabenU>>("VorgabenU") ?? { vorgabenB: BereitschaftsEinsatzZeiträume };
	const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
	const Jahr: number = Storage.get<number>("Jahr", { check: true });
	const vorgabenB: { [key: string]: IVorgabenUvorgabenB } = vorgabenU.vorgabenB ?? BereitschaftsEinsatzZeiträume;

	let vorgabenBStandardIndex = "2";
	for (const key in vorgabenB)
		if (vorgabenB[key].standard) {
			vorgabenBStandardIndex = key;
			break;
		}
	let auswahl: string = vorgabenBStandardIndex;

	const vorgabenB_Select = () => {
		const ref = createRef<HTMLSelectElement>();
		const changeHandler = () => {
			if (ref.current === null) throw Error("Referenz fehlt");
			auswahl = ref.current.value;
			BerVorgabeAEndern(modal, vorgabenB[auswahl], datum);
		};
		return (
			<MySelect
				myRef={ref}
				className="form-floating col-12 pb-3"
				id="vorgabeB"
				title="Auswahl Bereitschaft"
				value={auswahl}
				options={Object.entries(vorgabenB).map(value => {
					return {
						value: value[0],
						html: false,
						text:
							`${value[1].Name} | ` +
							`${dayjs().day(value[1].beginnB.tag).format("ddd")} - ${dayjs().day(value[1].endeB.tag).format("ddd")} | ` +
							`${
								value[1].nacht
									? `${dayjs().day(value[1].beginnN.tag).format("ddd")} - ${dayjs().day(value[1].endeN.tag).format("ddd")}`
									: "-----"
							}` +
							(value[1].standard ? " | Standard" : ""),
					};
				})}
				changeHandler={changeHandler}
			/>
		);
	};

	let datum: dayjs.Dayjs = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]).isoWeekday(vorgabenB[auswahl].beginnB.tag);

	if (datum.isSameOrBefore(dayjs([Jahr, Monat]).startOf("M"))) {
		datum = datum.add(1, "w");
	} else if (datum.isSameOrAfter(dayjs([Jahr, Monat]).endOf("M"))) {
		datum = datum.subtract(1, "w");
	}

	const datumInput = () => {
		const ref = createRef<HTMLInputElement>();
		const changeHandler = () => {
			if (ref.current === null) throw Error("Referenz fehlt");
			datum = dayjs(ref.current.value);
			datumAnpassen(modal, vorgabenB[auswahl], datum);
		};
		return (
			<MyInput
				myRef={ref}
				divClass="form-floating col-7 col-sm-6 pb-3"
				required
				type="Date"
				id="bA"
				name="Datum"
				min={datum.startOf("M").format("YYYY-MM-DD")}
				max={datum.endOf("M").format("YYYY-MM-DD")}
				value={datum.format("YYYY-MM-DD")}
				onChange={changeHandler}
			>
				Datum
			</MyInput>
		);
	};

	const modal: CustomHTMLDivElement<IDatenBZ> = showModal(
		<MyFormModal myRef={formRef} title="Neue Bereitschaft eingeben" onSubmit={onSubmit()}>
			<MyModalBody>
				{vorgabenB_Select()}
				<hr />
				<h4 className="text-center mb-1">Bereitschafts Anfang</h4>
				{datumInput()}
				{createTimeInputElement("bAT", "Von", vorgabenB[auswahl].beginnB.zeit)}

				<h4 className="text-center mb-1">Bereitschafts Ende</h4>
				{createDateInputElement(
					"bE",
					"Datum",
					datum.isoWeekday(vorgabenB[auswahl].endeB.tag).add(vorgabenB[auswahl].endeB.Nwoche ? 7 : 0, "d"),
					datum.startOf("M"),
					datum.add(1, "M").endOf("M"),
				)}
				{createTimeInputElement("bET", "Bis", vorgabenB[auswahl].endeB.zeit)}

				<hr />

				<MyCheckbox
					className="form-check form-switch bereitschaft"
					id="nacht"
					checked={vorgabenB[auswahl].nacht}
					changeHandler={() => {
						nachtAusblenden(modal);
					}}
				>
					Nachtschicht
				</MyCheckbox>

				<div className="row m-0 p-0" id="nachtschicht" style={{ display: !vorgabenB[auswahl].nacht ? "none" : undefined }}>
					<h4 className="text-center mb-1">Nacht Anfang</h4>
					{createDateInputElement(
						"nA",
						"Datum",
						datum.isoWeekday(vorgabenB[auswahl].beginnN.tag).add(vorgabenB[auswahl].beginnN.Nwoche ? 7 : 0, "d"),
						datum.subtract(1, "month").endOf("M"),
						datum.add(1, "M").endOf("M"),
					)}
					{createTimeInputElement("nAT", "Von", vorgabenB[auswahl].beginnN.zeit)}

					<h4 className="text-center mb-1">Nacht Ende</h4>
					{createDateInputElement(
						"nE",
						"Datum",
						datum.isoWeekday(vorgabenB[auswahl].endeN.tag).add(vorgabenB[auswahl].endeN.Nwoche ? 7 : 0, "d"),
						datum.startOf("M"),
						datum.add(1, "M").endOf("M"),
					)}
					{createTimeInputElement("nET", "Bis", vorgabenB[auswahl].endeN.zeit)}
				</div>
				<hr className="mt-3" />

				<MyCheckbox
					className="form-check form-switch bereitschaft"
					id="eigen"
					changeHandler={() => {
						eigeneWerte(modal, vorgabenB[auswahl], datum);
					}}
				>
					Eingabe Eigene Werte?
				</MyCheckbox>
			</MyModalBody>
		</MyFormModal>,
	);

	if (formRef.current === null) throw new Error("referenz nicht gesetzt");
	const form = formRef.current;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form?.checkValidity && !form.checkValidity()) return;
			event.preventDefault();
			BerZeitenEingabe(modal, Storage.get("accessToken", { check: true }));

			const table = document.querySelector<CustomHTMLTableElement<IDatenBZ>>("#tableBZ");
			Modal.getInstance(modal)?.hide();
			if (table) saveTableDataBZ(table.instance);
		};
	}
}
