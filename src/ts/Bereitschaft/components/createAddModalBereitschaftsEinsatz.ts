import Modal from "bootstrap/js/dist/modal";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyCheckbox,
	createModalBodyFillerElement,
	createModalBodyInputElement,
	createModalBodySelectElement,
} from "../../components";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { BerEinsatzEingabe } from "../utils";

export default function createAddModalBereitschaftsEinsatz(): void {
	const { modal, form } = createModal(
		"Neuen Bereitschaftseinsatz eingeben",
		true,
		null,
		createBodyElement,
		createEditorModalFooter(),
		SubmitEventListener,
	);
	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";

		const Jahr = Storage.get<number>("Jahr");
		const Monat = Storage.get<number>("Monat") - 1;
		const datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 col-sm-6 pb-3",
				title: "Datum",
				name: "Datum",
				value: datum.format("YYYY-MM-DD"),
				type: "date",
				required: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.endOf("M").format("YYYY-MM-DD"),
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 pb-3",
				title: "SAP-Nr / Einsatzbeschreibung",
				name: "SAPNR",
				type: "text",
				required: true,
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 col-sm-6 pb-3",
				title: "Von",
				name: "ZeitVon",
				type: "time",
				required: true,
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 col-sm-6 pb-3",
				title: "Bis",
				name: "ZeitBis",
				type: "time",
				required: true,
			}),
		);
		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col-12 col-sm-6 pb-3",
				title: "LRE",
				name: "LRE",
				options: [
					{ text: "Bitte Einsatz auswählen", disabled: true, selected: true },
					{ value: "LRE 1", text: "LRE 1" },
					{ value: "LRE 2", text: "LRE 2" },
					{ value: "LRE 1/2 ohne x", text: "LRE 1/2 ohne x" },
					{ value: "LRE 3", text: "LRE 3" },
					{ value: "LRE 3 ohne x", text: "LRE 3 ohne x" },
				],
				required: true,
			}),
		);
		modalBody.appendChild(createModalBodyFillerElement());
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 col-sm-6 pb-3",
				title: "Privat Km",
				name: "privatkm",
				type: "number",
				min: 0,
			}),
		);

		const wrapper = document.createElement("div");
		wrapper.className = "col-12";

		wrapper.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch bereitschaft",
				id: "berZeit",
				text: "zusätzliche Bereitschaftszeit Eingeben?<br><small>(z.B. LRE3 Außerhalb der Bereitschaft.)</small>",
				status: false,
			}),
		);
		modalBody.appendChild(wrapper);

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (form instanceof HTMLFormElement && !form.checkValidity()) return;
			event.preventDefault();

			BerEinsatzEingabe(modal);

			Modal.getInstance(modal)?.hide();
		};
	}
}
