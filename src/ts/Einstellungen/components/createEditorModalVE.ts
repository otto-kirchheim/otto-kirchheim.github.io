import Modal from "bootstrap/js/dist/modal";
import { Column, CustomTable, Row } from "../../class/CustomTable";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyCheckbox,
	createModalBodyInputElement,
	createModalBodySelectElement,
} from "../../components";
import type { CustomHTMLDivElement, IVorgabenUvorgabenB } from "../../interfaces";
import { saveTableData } from "../../utilities";

export default function createEditorModalVE(row: Row | CustomTable, titel: string): CustomHTMLDivElement {
	const { modal, form } = createModal(
		titel,
		true,
		null,
		createBodyElement,
		createEditorModalFooter(null, row instanceof Row ? "Speichern" : undefined),
		SubmitEventListener,
	);
	return modal;

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";
		let column: Column;
		column = row.columns.array.find((column: Column) => column.name === "Name") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells?.[column.name] : "",
				type: "text",
				required: true,
			}),
		);

		column = row.columns.array.find((column: Column) => column.name === "standard") as Column;
		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch col-12 pb-3",
				id: column.name,
				text: column.title,
				status: row instanceof Row ? row.cells?.[column.name] : false,
			}),
		);

		modalBody.appendChild(document.createElement("hr"));

		["beginnB", "endeB"].forEach(value => {
			column = row.columns.array.find((column: Column) => column.name === value) as Column;
			modalBody.appendChild(
				createModalBodySelectElement({
					divClass: `form-floating col-7 col-sm-6 ${value === "beginnB" ? "pb-3" : ""}`,
					title: column.title,
					name: `${column.name}Tag`,
					value: row instanceof Row ? row.cells?.[column.name].tag : "",
					required: true,
					options: [
						{ value: 1, text: "Montag" },
						{ value: 2, text: "Dienstag" },
						{ value: 3, text: "Mittwoch" },
						{ value: 4, text: "Donnerstag" },
						{ value: 5, text: "Freitag" },
						{ value: 6, text: "Samstag" },
						{ value: 0, text: "Sonntag" },
					],
				}),
			);
			modalBody.appendChild(
				createModalBodyInputElement({
					divClass: `form-floating col-5 col-sm-6 ${value === "beginnB" ? "pb-3" : ""}`,
					type: "time",
					title: column.title,
					name: `${column.name}Zeit`,
					value: row instanceof Row ? row.cells?.[column.name].zeit : "",
					required: true,
				}),
			);
			if (value === "endeB") {
				modalBody.appendChild(
					createModalBodyCheckbox({
						checkClass: "form-check form-switch col-12 pb-3",
						id: `${column.name}Nwoche`,
						text: '+1 Woche? <span class="text-secondary text-opacity-75">(Sonntag - Samstag)</span>',
						status: row instanceof Row ? row.cells?.[column.name].Nwoche : false,
					}),
				);
			}
		});

		modalBody.appendChild(document.createElement("hr"));

		column = row.columns.array.find((column: Column) => column.name === "nacht") as Column;
		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch col-12 pb-3",
				id: column.name,
				text: column.title,
				status: row instanceof Row ? row.cells?.[column.name] : false,
			}),
		);

		["beginnN", "endeN"].forEach(value => {
			column = row.columns.array.find((column: Column) => column.name === value) as Column;
			modalBody.appendChild(
				createModalBodySelectElement({
					divClass: "form-floating col-7 col-sm-6",
					title: column.title,
					name: `${column.name}Tag`,
					value: row instanceof Row ? row.cells?.[column.name].tag : "",
					required: true,
					options: [
						{ value: 1, text: "Montag" },
						{ value: 2, text: "Dienstag" },
						{ value: 3, text: "Mittwoch" },
						{ value: 4, text: "Donnerstag" },
						{ value: 5, text: "Freitag" },
						{ value: 6, text: "Samstag" },
						{ value: 0, text: "Sonntag" },
					],
				}),
			);
			modalBody.appendChild(
				createModalBodyInputElement({
					divClass: "form-floating col-5 col-sm-6",
					type: "time",
					title: column.title,
					name: `${column.name}Zeit`,
					value: row instanceof Row ? row.cells?.[column.name].zeit : "",
					required: true,
				}),
			);
			modalBody.appendChild(
				createModalBodyCheckbox({
					checkClass: "form-check form-switch col-12 pb-3",
					id: `${column.name}Nwoche`,
					text: '+1 Woche? <span class="text-secondary text-opacity-75">(Sonntag - Samstag)</span>',
					status: row instanceof Row ? row.cells?.[column.name].Nwoche : false,
				}),
			);
		});

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (form instanceof HTMLDivElement) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table = row instanceof Row ? row.CustomTable : row;

			const beginnBTag = Number(form.querySelector<HTMLInputElement>("#beginnBTag")?.value ?? NaN);
			const endeBTag = Number(form.querySelector<HTMLInputElement>("#endeBTag")?.value ?? NaN);
			const beginnNTag = Number(form.querySelector<HTMLInputElement>("#beginnNTag")?.value ?? NaN);
			const endeNTag = Number(form.querySelector<HTMLInputElement>("#endeNTag")?.value ?? NaN);
			const endeBNwoche = form.querySelector<HTMLInputElement>("#endeBNwoche")?.checked ?? false;
			const beginnNNwoche = form.querySelector<HTMLInputElement>("#beginnNNwoche")?.checked ?? false;
			const endeNNwoche = form.querySelector<HTMLInputElement>("#endeNNwoche")?.checked ?? false;
			const beginnBZeit = form.querySelector<HTMLInputElement>("#beginnBZeit")?.value ?? "";
			const endeBZeit = form.querySelector<HTMLInputElement>("#endeBZeit")?.value ?? "";
			const beginnNZeit = form.querySelector<HTMLInputElement>("#beginnNZeit")?.value ?? "";
			const endeNZeit = form.querySelector<HTMLInputElement>("#endeNZeit")?.value ?? "";
			const nameN = form.querySelector<HTMLInputElement>("#Name")?.value ?? "";
			const nacht = form.querySelector<HTMLInputElement>("#nacht")?.checked ?? false;
			const standard = form.querySelector<HTMLInputElement>("#standard")?.checked ?? false;

			const values: IVorgabenUvorgabenB = {
				Name: nameN,
				beginnB: { tag: beginnBTag, zeit: beginnBZeit },
				endeB: { tag: endeBTag, zeit: endeBZeit, Nwoche: endeBNwoche },
				nacht: nacht,
				beginnN: { tag: beginnNTag, zeit: beginnNZeit, Nwoche: beginnNNwoche },
				endeN: { tag: endeNTag, zeit: endeNZeit, Nwoche: endeNNwoche },
				standard: standard ? true : undefined,
			};
			if (standard) {
				let ft: CustomTable;
				let newStandard: Row | null;
				if (row instanceof Row) [ft, newStandard] = [row.CustomTable, row];
				else if (row instanceof CustomTable) [ft, newStandard] = [row, null];
				else throw new Error("CustomTable nicht gefunden");
				setStandard(ft, newStandard);
			}
			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableData(table);
		};

		function setStandard(ft: CustomTable, newStandard: Row | null): void {
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
