import { Modal } from "bootstrap";
import { createSnackBar } from "../../class/CustomSnackbar";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyInputElement,
	createModalBodySelectElement,
} from "../../components";
import type { CustomHTMLTableElement, IDaten } from "../../interfaces";
import { Storage, tableToArray } from "../../utilities";
import { addNebenTag } from "../utils";

export default function createAddModalNeben(): void {
	const { modal, form } = createModal(
		"Neuen Nebenbezug eingeben",
		true,
		null,
		createBodyElement,
		createEditorModalFooter([customFooterButtton()]),
		SubmitEventListener
	);
	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const dataE: IDaten["EWT"] = tableToArray("tableE");
		if (dataE.length === 0) {
			createSnackBar({
				message: 'Keine Tage in EWT gefunden. </br></br>Bitte erst EWT ausfüllen! </br>oder Manuell über "Neue Zeile"',
				timeout: 3000,
				position: "br",
				fixed: true,
			});
			throw new Error("'Keine Tage in EWT gefunden.");
		}
		console.log(dataE);

		const modalBody = document.createElement("div");
		modalBody.className = "modal-body";

		const warnung = document.createElement("p");
		warnung.className = "text-center";
		warnung.textContent = "!!! Erst EWT Eingeben und Berechnen !!!";
		modalBody.appendChild(warnung);

		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col mb-3",
				title: "Tag (Aus EWT)",
				name: "tagN",
				required: true,
				value: null,
				options: getTagOptions(),
			})
		);

		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col mb-3",
				title: "Nebenbezug (Aktuell nur 1 möglichkeit)",
				name: "Nebenbezug",
				required: true,
				value: null,
				options: [
					{
						value: "040 Fahrentsch.",
						text: "040 Fahrentsch.",
						selected: true,
					},
				],
			})
		);

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col",
				title: "Anzahl",
				name: "AnzahlN",
				value: 1,
				type: "number",
				required: true,
				min: 1,
				max: 1,
			})
		);

		return modalBody;

		function getTagOptions(): {
			value: string | number;
			text: string;
			disabled: boolean | undefined;
			selected: boolean | undefined;
		}[] {
			const dataN: IDaten["N"] = tableToArray("tableN");
			const jahr = Storage.get<number>("Jahr");
			const monat = Storage.get<number>("Monat");
			const options = [];
			for (const day of dataE) {
				const schicht = day.schichtE;
				let tagN: string,
					tag: string,
					pauseA = "12:00",
					pauseE = "12:30";
				if (["N", "BN"].includes(schicht)) {
					tagN = `0${+day.tagE - 1}`.slice(-2);
					tag = `${tagN} | ${new Date(jahr, monat - 1, +day.tagE - 1).toLocaleDateString("de", {
						weekday: "short",
					})}`;
					pauseA = "01:00";
					pauseE = "01:45";
				} else {
					tagN = `0${day.tagE}`.slice(-2);
					tag = `${tagN} | ${new Date(jahr, monat - 1, +day.tagE).toLocaleDateString("de", {
						weekday: "short",
					})}`;
					if (tag.includes("Fr")) {
						pauseA = "";
						pauseE = "";
					}
				}

				const option = {} as {
					value: string | number;
					text: string;
					disabled: boolean | undefined;
					selected: boolean | undefined;
				};
				if (schicht == "N") {
					option.text = `${tag} | Nacht`;
				} else if (schicht == "BN") {
					option.text = `${tag} | Nacht / Bereitschaft`;
				} else {
					option.text = tag;
				}
				option.value = JSON.stringify({
					tagN,
					beginN: day.beginE,
					endeN: day.endeE,
					beginPauseN: pauseA,
					endePauseN: pauseE,
					nrN: "",
					dauerN: 0,
				});
				if (dataN) {
					dataN.forEach(value => {
						if (Number(value.tagN) == Number(tagN)) {
							option.disabled = true;
						}
					});
				}
				options.push(option);
			}
			return options;
		}
	}

	function customFooterButtton(): HTMLButtonElement {
		const btnManuell = document.createElement("button");
		btnManuell.className = "btn btn-info";
		btnManuell.type = "button";
		btnManuell.textContent = "Manuell";
		btnManuell.ariaLabel = "Manuell";
		btnManuell.dataset.bsDismiss = "modal";
		btnManuell.addEventListener("click", () => {
			const table = document.querySelector<CustomHTMLTableElement>("#tableN");
			if (!table) throw new Error("table N nicht gefunden");

			table.instance.options.editing.addRow();
		});
		return btnManuell;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (form instanceof HTMLFormElement && !form.checkValidity()) return;
			event.preventDefault();

			addNebenTag(form);
		};
	}
}
