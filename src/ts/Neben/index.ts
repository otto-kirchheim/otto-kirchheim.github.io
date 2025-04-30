import { createSnackBar } from "../class/CustomSnackbar";
import { createCustomTable } from "../class/CustomTable";
import { Storage, buttonDisable, saveDaten } from "../utilities";
import download from "../utilities/download";
import { EditorModalNeben, ShowModalNeben, createAddModalNeben } from "./components";
import { DataN, saveTableDataN } from "./utils";

window.addEventListener("load", () => {
	const Jahr: number = Storage.get("Jahr", { default: new Date().getFullYear() });

	const checkIfGreater2024 = (Jahr: number, showError?: boolean) => {
		const checked: boolean = Jahr >= 2024;
		if (!checked && showError)
			createSnackBar({
				message: "Sorry, für 2023 gibt es keine Nebengelder mehr...",
				icon: "!",
				status: "error",
			});

		return checked;
	};

	const getEmptyText = (Jahr: number) => (checkIfGreater2024(Jahr) ? "Keine Daten gefunden" : "Neu ab 2024");

	const ftN = createCustomTable("tableN", {
		columns: [
			{ name: "tagN", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "beginN", title: "Arbeit Von", type: "time" },
			{ name: "endeN", title: "Arbeit Bis", type: "time" },
			{ name: "anzahl040N", title: "040 Fahrentschädigung", breakpoints: "md" },
			{ name: "auftragN", title: "Auftragsnummer", breakpoints: "md" },
		],
		empty: () => getEmptyText(Jahr),
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
	btnESN?.addEventListener("click", () => {
		if (checkIfGreater2024(Jahr, true)) createAddModalNeben();
	});

	const btnSaveN = document.querySelector<HTMLButtonElement>("#btnSaveN");
	btnSaveN?.addEventListener("click", () => {
		saveDaten(btnSaveN);
	});

	const btnDownloadN = document.querySelector<HTMLButtonElement>("#btnDownloadN");
	btnDownloadN?.addEventListener("click", () => {
		if (checkIfGreater2024(Jahr, true)) download(btnDownloadN, "N");
	});
});
