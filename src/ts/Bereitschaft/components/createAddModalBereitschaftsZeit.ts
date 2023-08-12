import Modal from "bootstrap/js/dist/modal";
import { BereitschaftsEinsatzZeiträume } from "..";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyCheckbox,
	createModalBodyInputElement,
	createModalBodySelectElement,
	createModalBodyTitelElement,
} from "../../components";
import type { CustomHTMLTableElement, IVorgabenU } from "../../interfaces";
import { IVorgabenUvorgabenB } from "../../interfaces/IVorgabenU";
import { Storage, checkMaxTag, saveTableData } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import {
	bereitschaftEingabeWeb,
	bereitschaftsVorgabeAEndern,
	datumAnpassen,
	eigeneWerte,
	nachtAusblenden,
} from "../utils";

export default function createAddModalBereitschaftsZeit(): void {
	const { modal, form } = createModal(
		"Neue Bereitschaft eingeben",
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

		const vorgabenU = Storage.get<Partial<IVorgabenU>>("VorgabenU") ?? { vorgabenB: BereitschaftsEinsatzZeiträume };
		const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
		const Jahr: number = Storage.get<number>("Jahr", { check: true });
		const vorgabenB: { [key: string]: IVorgabenUvorgabenB } = vorgabenU.vorgabenB
			? vorgabenU.vorgabenB
			: BereitschaftsEinsatzZeiträume;

		let vorgabenBStandardIndex = "2";
		for (const key in vorgabenB)
			if (vorgabenB[key].standard) {
				vorgabenBStandardIndex = key;
				break;
			}

		const vorgabeB_Div = createModalBodySelectElement({
			divClass: "form-floating col-12 pb-3",
			title: "Auswahl Bereitschaft",
			name: "vorgabeB",
			value: vorgabenBStandardIndex,
			options: Object.entries(vorgabenB).map(value => {
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
			}),
			eventListener: () => {
				if (!vorgabeB_Select) throw new Error("VorgabeB Input nicht gefunden");
				bereitschaftsVorgabeAEndern(modalBody, vorgabenB[vorgabeB_Select.value]);
			},
		});
		modalBody.appendChild(vorgabeB_Div);

		const vorgabeB_Select = vorgabeB_Div.querySelector<HTMLSelectElement>("#vorgabeB");
		if (!vorgabeB_Select) throw new Error("VorgabeB Input nicht gefunden");

		const auswahl = vorgabeB_Select.value;

		let datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]).isoWeekday(vorgabenB[auswahl].beginnB.tag);
		if (datum.isSameOrBefore(dayjs([Jahr, Monat]).startOf("M"))) {
			datum = datum.add(1, "w");
		} else if (datum.isSameOrAfter(dayjs([Jahr, Monat]).endOf("M"))) {
			datum = datum.subtract(1, "w");
		}

		modalBody.appendChild(document.createElement("hr"));

		modalBody.appendChild(createModalBodyTitelElement("Bereitschafts Anfang"));
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-7 col-sm-6 pb-3",
				title: "Datum",
				name: "bA",
				value: datum.format("YYYY-MM-DD"),
				type: "Date",
				required: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.endOf("M").format("YYYY-MM-DD"),
				eventListener: () => {
					const datum = modalBody.querySelector<HTMLInputElement>("#bA");
					if (!datum) throw new Error("Datum nicht gefunden");
					datumAnpassen(modalBody, vorgabenB[vorgabeB_Select.value], dayjs(datum.value));
				},
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-5 col-sm-6 pb-3",
				title: "Von",
				name: "bAT",
				value: vorgabenB[auswahl].beginnB.zeit,
				type: "time",
				required: true,
				disabled: true,
			}),
		);
		modalBody.appendChild(createModalBodyTitelElement("Bereitschafts Ende"));
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-7 col-sm-6 pb-3",
				title: "Datum",
				name: "bE",
				value: datum
					.isoWeekday(vorgabenB[auswahl].endeB.tag)
					.add(vorgabenB[auswahl].endeB.Nwoche ? 7 : 0, "d")
					.format("YYYY-MM-DD"),
				type: "Date",
				required: true,
				disabled: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.add(1, "M").endOf("M").format("YYYY-MM-DD"),
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-5 col-sm-6 pb-3",
				title: "Bis",
				name: "bET",
				value: vorgabenB[auswahl].endeB.zeit,
				type: "time",
				required: true,
				disabled: true,
			}),
		);
		modalBody.appendChild(document.createElement("hr"));
		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch bereitschaft",
				id: "nacht",
				text: "Nachtschicht",
				status: vorgabenB[auswahl].nacht,
				eventListener: () => nachtAusblenden(modalBody),
			}),
		);

		const nachtWrapper = document.createElement("div");
		nachtWrapper.id = "nachtschicht";
		nachtWrapper.className = "row m-0 p-0";
		if (!vorgabenB[auswahl].nacht) nachtWrapper.style.display = "none";
		modalBody.appendChild(nachtWrapper);

		nachtWrapper.appendChild(createModalBodyTitelElement("Nacht Anfang"));
		nachtWrapper.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-7 col-sm-6 pb-3",
				title: "Datum",
				name: "nA",
				value: datum
					.isoWeekday(vorgabenB[auswahl].beginnN.tag)
					.add(vorgabenB[auswahl].beginnN.Nwoche ? 7 : 0, "d")
					.format("YYYY-MM-DD"),
				type: "Date",
				required: true,
				disabled: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.add(1, "M").endOf("M").format("YYYY-MM-DD"),
			}),
		);
		nachtWrapper.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-5 col-sm-6 pb-3",
				title: "Von",
				name: "nAT",
				value: vorgabenB[auswahl].beginnN.zeit,
				type: "time",
				required: true,
				disabled: true,
			}),
		);

		nachtWrapper.appendChild(createModalBodyTitelElement("Nacht Ende"));
		nachtWrapper.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-7 col-sm-6 pb-3",
				title: "Datum",
				name: "nE",
				value: datum
					.isoWeekday(vorgabenB[auswahl].endeN.tag)
					.add(vorgabenB[auswahl].endeN.Nwoche ? 7 : 0, "d")
					.format("YYYY-MM-DD"),
				type: "Date",
				required: true,
				disabled: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.add(1, "M").endOf("M").format("YYYY-MM-DD"),
			}),
		);
		nachtWrapper.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-5 col-sm-6 pb-3",
				title: "Bis",
				name: "nET",
				value: vorgabenB[auswahl].endeN.zeit,
				type: "time",
				required: true,
				disabled: true,
			}),
		);
		const customHrElement = document.createElement("hr");
		customHrElement.classList.add("mt-3");

		modalBody.appendChild(customHrElement);
		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch bereitschaft",
				id: "eigen",
				text: "Eingabe Eigene Werte?",
				status: false,
				eventListener: () => {
					const datum = modalBody.querySelector<HTMLInputElement>("#bA");
					if (!datum) throw new Error("Datum nicht gefunden");
					eigeneWerte(modalBody, vorgabenB[vorgabeB_Select.value], dayjs(datum.value));
				},
			}),
		);

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (form instanceof HTMLFormElement && !form.checkValidity()) return;
			event.preventDefault();

			bereitschaftEingabeWeb(modal, Storage.get("accessToken", { check: true })).catch((err: Error) => {
				throw err;
			});

			const table = document.querySelector<CustomHTMLTableElement>("#tableBZ");

			Modal.getInstance(modal)?.hide();

			if (table) saveTableData(table.instance);
		};
	}
}
