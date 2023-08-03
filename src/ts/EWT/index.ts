import { Modal } from "bootstrap";
import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { IDaten, IVorgabenU } from "../interfaces";
import { Storage, buttonDisable, download, saveDaten, saveTableData } from "../utilities";
import { createAddModalEWT, createEditorModalEWT, createShowModalEWT } from "./components";
import { DataE, addEventlistenerToggleBerechnen, ewtBerechnen } from "./utils";

window.addEventListener("load", () => {
	const berechnenParser = (value: boolean): string => {
			return `<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"${
				value ? " checked" : ""
			}></div>`;
		},
		schichtParser = (value: string): string => {
			switch (value) {
				case "T":
					return "Tag";
				case "N":
					return "Nacht";
				case "BN":
					return "<span class='SchichtBereitschaft'>Bereitschaft<br>+ Nacht</span>";
				case "S":
					return "Sonder";
				default:
					return "";
			}
		},
		ftE = createCustomTable("tableE", {
			columns: [
				{ name: "tagE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
				{ name: "eOrtE", title: "Einsatzort", classes: ["custom-text-truncate"], type: "text" },
				{ name: "schichtE", title: "Schicht", parser: schichtParser, type: "time" },
				{ name: "abWE", title: "Ab Wohnung", breakpoints: "xl", type: "time" },
				{ name: "beginE", title: "Arbeitszeit Von", breakpoints: "md", type: "time" },
				{ name: "ab1E", title: "Ab 1.Tgk.-St.", breakpoints: "lg", type: "time" },
				{ name: "anEE", title: "An Einsatzort", breakpoints: "lg", type: "time" },
				{ name: "abEE", title: "Ab Einsatzort", breakpoints: "lg", type: "time" },
				{ name: "an1E", title: "An 1.Tgk.-St.", breakpoints: "lg", type: "time" },
				{ name: "endeE", title: "Arbeitszeit Bis", breakpoints: "md", type: "time" },
				{ name: "anWE", title: "An Wohnung", breakpoints: "xl", type: "time" },
				{ name: "berechnen", title: "Berechnen?", parser: berechnenParser, breakpoints: "xxl" },
			],
			rows: DataE(),
			sorting: { enabled: true },
			editing: {
				enabled: true,
				addRow: () => {
					const $modal = createEditorModalEWT(ftE, "Anwesenheit hinzufügen");
					$modal.row = ftE;
					new Modal($modal).show();
				},
				editRow: row => {
					const $modal = createEditorModalEWT(row, "Anwesenheit bearbeiten");
					$modal.row = row;
					new Modal($modal).show();
				},
				showRow: row => {
					const $modal = createShowModalEWT(row, "Anwesenheit anzeigen");
					$modal.row = row;
					new Modal($modal).show();
				},
				deleteRow: row => {
					row.deleteRow();
					saveTableData(ftE);
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
									ftE.rows.load([]);
									buttonDisable(false);
									Storage.set("dataE", []);
								},
								dismiss: true,
								class: ["text-danger"],
							},
							{ text: "Nein", dismiss: true, class: ["text-primary"] },
						],
					});
				},
				customButton: [
					{
						classes: ["btn", "btn-secondary"],
						text: "Alle Zeiten entfernen",
						function: () => {
							createSnackBar({
								message:
									"Möchtest du wirklich alle Zeiten entfernen?<br /><small>(nur bei Zeilen die auch berechnet werden)</small>",
								icon: "question",
								status: "error",
								dismissible: false,
								timeout: false,
								fixed: true,
								actions: [
									{
										text: "Ja",
										function: () => {
											const rows = [...ftE.rows.array];
											const newRows: { [key: string]: unknown }[] = [];
											rows.forEach(row => {
												if (!row.cells.berechnen) return newRows.push(row.cells);
												row.cells.abWE = "";
												row.cells.ab1E = "";
												row.cells.anEE = "";
												row.cells.beginE = "";
												row.cells.endeE = "";
												row.cells.abEE = "";
												row.cells.an1E = "";
												row.cells.anWE = "";
												return newRows.push(row.cells);
											});
											ftE.rows.load(newRows);
											saveTableData(ftE);
										},
										dismiss: true,
										class: ["text-danger"],
									},
									{ text: "Nein", dismiss: true, class: ["text-primary"] },
								],
							});
						},
					},
				],
			},
			customFunction: {
				afterDrawRows: addEventlistenerToggleBerechnen,
			},
		});

	const btnZb = document.querySelector<HTMLButtonElement>("#btnZb");
	btnZb?.addEventListener("click", () => {
		const monat = Storage.check("Monat") ? Storage.get<number>("Monat") : 0;
		ewtBerechnen({
			monat,
			jahr: Storage.get<number>("Jahr"),
			daten: Storage.get<IDaten["EWT"]>("dataE")[monat] ?? [],
			vorgabenU: Storage.get<IVorgabenU>("VorgabenU"),
		});
	});

	const btnSaveE = document.querySelector<HTMLButtonElement>("#btnSaveE");
	btnSaveE?.addEventListener("click", () => {
		saveDaten(btnSaveE);
	});

	const btnDownloadE = document.querySelector<HTMLButtonElement>("#btnDownloadE");
	btnDownloadE?.addEventListener("click", () => {
		download(btnDownloadE, "E");
	});

	const btnESEE = document.querySelector<HTMLButtonElement>("#btnESEE");
	btnESEE?.addEventListener("click", createAddModalEWT);
});
