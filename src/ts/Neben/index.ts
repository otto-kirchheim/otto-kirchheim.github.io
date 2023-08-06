import Modal from "bootstrap/js/dist/modal";
import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { buttonDisable, download, saveDaten, saveTableData, Storage } from "../utilities";
import { createAddModalNeben, createEditorModalNeben, createShowModalNeben } from "./components";
import { DataN } from "./utils";

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
				const $modal = createEditorModalNeben(ftN, "Nebenbezug hinzufügen");
				$modal.row = ftN;
				new Modal($modal).show();
			},
			editRow: row => {
				const $modal = createEditorModalNeben(row, "Nebenbezug bearbeiten");
				$modal.row = row;
				new Modal($modal).show();
			},
			showRow: row => {
				const $modal = createShowModalNeben(row, "Nebenbezug anzeigen");
				$modal.row = row;
				new Modal($modal).show();
			},
			deleteRow: row => {
				row.deleteRow();
				saveTableData(ftN);
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

	const btnESN = document.querySelector<HTMLButtonElement>("#btnESN");
	btnESN?.addEventListener("click", () => {
		createAddModalNeben();
	});

	const btnSaveN = document.querySelector<HTMLButtonElement>("#btnSaveN");
	btnSaveN?.addEventListener("click", () => {
		saveDaten(btnSaveN);
	});

	const btnDownloadN = document.querySelector<HTMLButtonElement>("#btnDownloadN");
	btnDownloadN?.addEventListener("click", () => {
		download(btnDownloadN, "N");
	});
});
