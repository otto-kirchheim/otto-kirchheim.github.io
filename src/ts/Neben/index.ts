import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { buttonDisable, download, saveDaten } from "../utilities";
import { EditorModalNeben, ShowModalNeben, createAddModalNeben } from "./components";
import { DataN, saveTableDataN } from "./utils";

window.addEventListener("load", () => {
	const ftN = createCustomTable("tableN", {
		columns: [
			{ name: "tagN", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "beginN", title: "Arbeit Von", type: "time" },
			{ name: "endeN", title: "Arbeit Bis", type: "time" },
			{ name: "beginPauseN", title: "Pause Von", breakpoints: "sm", type: "time" },
			{ name: "endePauseN", title: "Pause Bis", breakpoints: "sm", type: "time" },
			{ name: "dauerN", title: "Anzahl", breakpoints: "md" },
			{ name: "nrN", title: "Zulage", breakpoints: "md" },
		],
		rows: DataN(),
		sorting: { enabled: true },
		editing: {
			enabled: true,
			addRow: () => {
				EditorModalNeben(ftN, "Nebenbezug hinzufügen");
			},
			editRow: row => {
				EditorModalNeben(row, "Nebenbezug bearbeiten");
			},
			showRow: row => {
				ShowModalNeben(row, "Nebenbezug anzeigen");
			},
			deleteRow: row => {
				row.deleteRow();
				saveTableDataN(ftN);
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
								ftN.rows.load([]);
								buttonDisable(false);
								saveTableDataN(ftN);
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

	const btnESN = document.querySelector<HTMLButtonElement>("#btnESN");
	btnESN?.addEventListener("click", createAddModalNeben);

	const btnSaveN = document.querySelector<HTMLButtonElement>("#btnSaveN");
	btnSaveN?.addEventListener("click", () => {
		saveDaten(btnSaveN);
	});

	const btnDownloadN = document.querySelector<HTMLButtonElement>("#btnDownloadN");
	btnDownloadN?.addEventListener("click", () => {
		download(btnDownloadN, "N");
	});
});
