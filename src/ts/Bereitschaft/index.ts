import { Modal } from "bootstrap";
import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { IVorgabenUvorgabenB } from "../interfaces";
import { Storage, buttonDisable, download, saveDaten, saveTableData } from "../utilities";
import dayjs from "../utilities/configDayjs";
import {
	createAddModalBereitschaftsEinsatz,
	createAddModalBereitschaftsZeit,
	createEditorModalBereitschaftsEinsatz,
	createEditorModalBereitschaftsZeit,
	createShowModalBereitschaft,
} from "./components";
import { DataBE, DataBZ } from "./utils";

export const BereitschaftsEinsatzZeiträume: { [key: string]: IVorgabenUvorgabenB } = {
	0: {
		Name: "B1",
		beginnB: { tag: 3, zeit: "15:45" },
		endeB: { tag: 3, zeit: "07:00", Nwoche: true },
		nacht: false,
		beginnN: { tag: 0, zeit: "19:30", Nwoche: true },
		endeN: { tag: 3, zeit: "06:15", Nwoche: true },
		standard: true,
	},
	1: {
		Name: "B2",
		beginnB: { tag: 3, zeit: "15:45" },
		endeB: { tag: 6, zeit: "19:45", Nwoche: false },
		nacht: false,
		beginnN: { tag: 6, zeit: "19:45", Nwoche: false },
		endeN: { tag: 3, zeit: "06:15", Nwoche: true },
	},
	2: {
		Name: "B1 + Nacht",
		beginnB: { tag: 3, zeit: "15:45" },
		endeB: { tag: 3, zeit: "07:00", Nwoche: true },
		nacht: true,
		beginnN: { tag: 0, zeit: "19:30", Nwoche: true },
		endeN: { tag: 3, zeit: "06:15", Nwoche: true },
	},
	3: {
		Name: "B1 + Nacht (ab Sa)",
		beginnB: { tag: 3, zeit: "15:45" },
		endeB: { tag: 3, zeit: "07:00", Nwoche: true },
		nacht: true,
		beginnN: { tag: 6, zeit: "19:45", Nwoche: false },
		endeN: { tag: 3, zeit: "06:15", Nwoche: true },
	},
};

window.addEventListener("load", () => {
	const datetimeParser = (value: string): string => dayjs(value).format("DD.MM.YYYY, LT"),
		timeZeroParser = (value: number): number | string => (!value ? "" : value),
		ftBZ = createCustomTable("tableBZ", {
			columns: [
				{ name: "beginB", title: "Von", parser: datetimeParser, sortable: true, sorted: true, direction: "ASC" },
				{ name: "endeB", title: "Bis", parser: datetimeParser, sortable: true },
				{ name: "pauseB", title: "Pause", parser: timeZeroParser, breakpoints: "xs" },
			],
			rows: DataBZ(),
			sorting: { enabled: true },
			editing: {
				enabled: true,
				addRow: () => {
					const $modal = createEditorModalBereitschaftsZeit(ftBZ, "Zeitraum hinzufügen");
					$modal.row = ftBZ;
					new Modal($modal).show();
				},
				editRow: row => {
					const $modal = createEditorModalBereitschaftsZeit(row, "Zeitraum bearbeiten");
					$modal.row = row;
					new Modal($modal).show();
				},
				showRow: row => {
					const $modal = createShowModalBereitschaft(row, "Zeitraum anzeigen");
					$modal.row = row;
					new Modal($modal).show();
				},
				deleteRow: row => {
					row.deleteRow();
					saveTableData(ftBZ);
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
									ftBZ.rows.load([]);
									buttonDisable(false);
									Storage.set("dataBZ", []);
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

	// ----------------------------- Bereitschaftseinsätze ------------------------------------------------

	const ftBE = createCustomTable("tableBE", {
		columns: [
			{ name: "tagBE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "auftragsnummerBE", title: "Auftrags-Nr.", classes: ["custom-text-truncate"] },
			{ name: "beginBE", title: "Von", breakpoints: "sm", type: "time" },
			{ name: "endeBE", title: "Bis", breakpoints: "sm", type: "time" },
			{ name: "lreBE", title: "LRE" },
			{ name: "privatkmBE", title: "Privat Km", parser: timeZeroParser, breakpoints: "md" },
		],
		rows: DataBE(),
		sorting: { enabled: true },
		editing: {
			enabled: true,
			addRow: () => {
				const $modal = createEditorModalBereitschaftsEinsatz(ftBE, "Einsatz hinzufügen");
				$modal.row = ftBE;
				new Modal($modal).show();
			},
			editRow: row => {
				const $modal = createEditorModalBereitschaftsEinsatz(row, "Einsatz bearbeiten");
				$modal.row = row;
				new Modal($modal).show();
			},
			showRow: row => {
				const $modal = createShowModalBereitschaft(row, "Einsatz anzeigen");
				$modal.row = row;
				new Modal($modal).show();
			},
			deleteRow: row => {
				row.deleteRow();
				saveTableData(ftBE);
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
								ftBE.rows.load([]);
								buttonDisable(false);
								Storage.set("dataBE", []);
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

	// "click"-Eventlistener
	const btnESZ = document.querySelector<HTMLButtonElement>("#btnESZ");
	const btnESE = document.querySelector<HTMLButtonElement>("#btnESE");
	const btnSaveB = document.querySelector<HTMLButtonElement>("#btnSaveB");
	const btnDownloadB = document.querySelector<HTMLButtonElement>("#btnDownloadB");

	if (btnESZ) btnESZ.addEventListener("click", createAddModalBereitschaftsZeit);

	if (btnESE) btnESE.addEventListener("click", createAddModalBereitschaftsEinsatz);

	if (btnSaveB)
		btnSaveB.addEventListener("click", () => {
			saveDaten(btnSaveB);
		});

	if (btnDownloadB)
		btnDownloadB.addEventListener("click", () => {
			download(btnDownloadB, "B");
		});
});
