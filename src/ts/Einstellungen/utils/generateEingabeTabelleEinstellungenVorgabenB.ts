import Modal from "bootstrap/js/dist/modal";
import { createSnackBar } from "../../class/CustomSnackbar";
import { Row, createCustomTable } from "../../class/CustomTable";
import type { IVorgabenU, IVorgabenUvorgabenB } from "../../interfaces";
import { Storage, buttonDisable } from "../../utilities";
import { createEditorModalVE, createShowModalVE } from "../components";

export default function generateEingabeTabelleEinstellungenVorgabenB(VorgabenB?: {
	[key: string]: IVorgabenUvorgabenB;
}) {
	if (!VorgabenB) VorgabenB = Storage.check("VorgabenU") ? Storage.get<IVorgabenU>("VorgabenU").vorgabenB : {};

	const trueParser = (value: boolean | null): string => (value ? "Ja" : "Nein");

	const addWeekParser = (value: { tag: number; zeit: string; Nwoche?: boolean }, umbruchString: string): string => {
		if (value.Nwoche === undefined || value.Nwoche === false) return `${umbruchString} - `;
		return `${umbruchString}+1 Woche`;
	};
	const weekdayParser = (value: { tag: number; zeit: string; Nwoche?: boolean }, umbruch = true): string => {
		const umbruchString: string = umbruch ? "<br/>" : " | ";
		const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
		const weekday = weekdays[value.tag % 7];
		const week = addWeekParser(value, umbruchString);
		return `${weekday}${week}${umbruchString}${value.zeit}`;
	};
	const ftVE = createCustomTable("tableVE", {
		columns: [
			{ name: "Name", title: "Name" },
			{ name: "standard", title: "Standard", parser: trueParser, breakpoints: "md" },
			{ name: "beginnB", title: "Von", parser: weekdayParser, breakpoints: "sm" },
			{ name: "endeB", title: "Bis", parser: weekdayParser, breakpoints: "sm" },
			{ name: "nacht", title: "Nacht?", parser: trueParser, breakpoints: "lg" },
			{ name: "beginnN", title: "Von", parser: weekdayParser, breakpoints: "lg" },
			{ name: "endeN", title: "Bis", parser: weekdayParser, breakpoints: "lg" },
		],
		rows: [...Object.values(VorgabenB)],
		editing: {
			enabled: true,
			addRow: () => {
				const $modal = createEditorModalVE(ftVE, "Voreinstellung hinzufügen");
				$modal.row = ftVE;
				new Modal($modal).show();
			},
			editRow: (row: Row) => {
				const $modal = createEditorModalVE(row, "Voreinstellung bearbeiten");
				$modal.row = row;
				new Modal($modal).show();
			},
			showRow: (row: Row) => {
				const $modal = createShowModalVE(row, "Voreinstellung anzeigen");
				$modal.row = row;
				new Modal($modal).show();
			},
			deleteRow: (row: Row) => {
				if (!row.cells.standard) {
					row.deleteRow();
				} else {
					createSnackBar({
						message: "Löschen von Standard nicht möglich<br /><small>(Bitte erst neuen Standart setzten)</small>",
						icon: "!",
						status: "info",
						timeout: 3000,
						fixed: true,
					});
				}
			},
			deleteAllRows: () => {
				createSnackBar({
					message: "Möchtest du wirklich alle Zeilen löschen?",
					icon: "question",
					status: "error",
					dismissible: false,
					timeout: false,
					fixed: true,
					actions: [
						{
							text: "Ja",
							function: () => {
								ftVE.rows.load([]);
								buttonDisable(false);
							},
							dismiss: true,
							class: ["text-danger"],
						},
						{ text: "Nein", dismiss: true, class: ["text-primary"] },
					],
				});
			},
		},
	});
}
