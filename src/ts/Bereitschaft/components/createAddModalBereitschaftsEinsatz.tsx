import Modal from "bootstrap/js/dist/modal";
import { createRef } from "preact";
import { MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenBE } from "../../interfaces";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { BerEinsatzEingabe } from "../utils";

export default function createAddModalBereitschaftsEinsatz(): void {
	const formRef = createRef<HTMLFormElement>();

	const Jahr: number = Storage.get<number>("Jahr", { check: true });
	const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
	const datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);

	const modal: CustomHTMLDivElement<IDatenBE> = showModal(
		<MyFormModal myRef={formRef} title="Neuen Bereitschaftseinsatz eingeben" onSubmit={onSubmit()}>
			<MyModalBody>
				<MyInput
					divClass="form-floating col-12 col-sm-6 pb-3"
					required
					type="Date"
					id="Datum"
					name="Datum"
					min={datum.startOf("M").format("YYYY-MM-DD")}
					max={datum.endOf("M").format("YYYY-MM-DD")}
					value={datum.format("YYYY-MM-DD")}
				>
					Datum
				</MyInput>
				<MyInput divClass="form-floating col-12 pb-3" required type="text" id="SAPNR" name="SAP-Nr / Einsatzbeschreibung">
					SAP-Nr / Einsatzbeschreibung
				</MyInput>
				<MyInput divClass="form-floating col-12 col-sm-6 pb-3" required type="time" id="ZeitVon" name="Von">
					Von
				</MyInput>
				<MyInput divClass="form-floating col-12 col-sm-6 pb-3" required type="time" id="ZeitBis" name="Bis">
					Bis
				</MyInput>
				<MySelect
					className="form-floating col-12 col-sm-6 pb-3"
					required
					id="LRE"
					title="LRE"
					options={[
						{ text: "Bitte Einsatz auswählen", disabled: true, selected: true },
						{ value: "LRE 1", text: "LRE 1" },
						{ value: "LRE 2", text: "LRE 2" },
						{ value: "LRE 1/2 ohne x", text: "LRE 1/2 ohne x" },
						{ value: "LRE 3", text: "LRE 3" },
						{ value: "LRE 3 ohne x", text: "LRE 3 ohne x" },
					]}
				/>
				<div className="w-100" />
				<MyInput divClass="form-floating col-12 col-sm-6 pb-3" type="number" id="privatkm" name="Privat Km" min={0}>
					Privat Km
				</MyInput>
				<div className="col-12">
					<MyCheckbox className="form-check form-switch bereitschaft" id="berZeit">
						zusätzliche Bereitschaftszeit Eingeben?
						<br />
						<small>(z.B. LRE3 Außerhalb der Bereitschaft.)</small>
					</MyCheckbox>
				</div>
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
			BerEinsatzEingabe(modal);

			Modal.getInstance(modal)?.hide();
		};
	}
}
