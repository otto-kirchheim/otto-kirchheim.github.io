import { DataBE, DataBZ } from "../../Bereitschaft/utils";
import { DataE } from "../../EWT/utils";
import { DataN } from "../../Neben/utils";
import { createSnackBar } from "../../class/CustomSnackbar";
import { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from "../../interfaces";
import { Storage, buttonDisable, setDisableButton } from "../../utilities";
import { setMonatJahr } from ".";

export default function changeMonatJahr(): void {
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	if (!monatInput || !jahrInput) throw new Error("Input Monat oder Jahr nicht gefunden");

	if (Storage.compare<number>("Jahr", Number(jahrInput.value))) {
		buttonDisable(false);
		if (!navigator.onLine) setDisableButton(true);

		if (!Storage.compare<number>("Monat", Number(monatInput.value))) {
			const jahr = Number(jahrInput.value);
			const monat = Number(monatInput.value);
			Storage.set("Monat", monat);
			setMonatJahr(jahr, monat);
			changeMonatTableData({ monat });

			createSnackBar({ message: `Monat geändert.`, status: "success", timeout: 3000, fixed: true });
		}
		return;
	} else changeMonatTableData({ data: [] });

	buttonDisable(true);
	const auswaehlenBtn = document.querySelector<HTMLButtonElement>("#btnAuswaehlen");
	if (navigator.onLine && auswaehlenBtn) auswaehlenBtn.disabled = false;
}

function changeMonatTableData({
	monat,
	data,
}: { monat?: number; data?: IDatenBZ[] | IDatenBE[] | IDatenEWT[] | IDatenN[] } = {}) {
	document
		.querySelector<CustomHTMLTableElement>("#tableBZ")
		?.instance.rows.load(DataBZ(data as IDatenBZ[] | undefined, monat));
	document
		.querySelector<CustomHTMLTableElement>("#tableBE")
		?.instance.rows.load(DataBE(data as IDatenBE[] | undefined, monat));
	document
		.querySelector<CustomHTMLTableElement>("#tableE")
		?.instance.rows.load(DataE(data as IDatenEWT[] | undefined, monat));
	document
		.querySelector<CustomHTMLTableElement>("#tableN")
		?.instance.rows.load(DataN(data as IDatenN[] | undefined, monat));
}
