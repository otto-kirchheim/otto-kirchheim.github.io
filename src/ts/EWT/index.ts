import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { IDatenEWT, IDatenEWTJahr, IVorgabenU } from "../interfaces";
import { Storage, buttonDisable, download, saveDaten } from "../utilities";
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from "./components";
import { DataE, addEventlistenerToggleBerechnen, ewtBerechnen, saveTableDataEWT } from "./utils";

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
					return "Unbekannt";
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
					EditorModalEWT(ftE, "Anwesenheit hinzufügen");
				},
				editRow: row => {
					EditorModalEWT(row, "Anwesenheit bearbeiten");
				},
				showRow: row => {
					ShowModalEWT(row, "Anwesenheit anzeigen");
				},
				deleteRow: row => {
					row.deleteRow();
					saveTableDataEWT(ftE);
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
									saveTableDataEWT(ftE);
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
											const newRows: IDatenEWT[] = [];
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
											saveTableDataEWT(ftE);
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
		const monat = Storage.check("Monat") ? Storage.get<number>("Monat", true) : 0;
		ewtBerechnen({
			monat,
			jahr: Storage.get<number>("Jahr", { check: true }),
			daten: Storage.get<IDatenEWTJahr>("dataE", { check: true })[monat] ?? [],
			vorgabenU: Storage.get<IVorgabenU>("VorgabenU", { check: true }),
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
