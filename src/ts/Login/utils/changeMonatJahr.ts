import { DataBE, DataBZ } from "../../Bereitschaft/utils";
import { DataE } from "../../EWT/utils";
import { DataN } from "../../Neben/utils";
import { createSnackBar } from "../../class/CustomSnackbar";
import { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from "../../interfaces";
import { Storage, buttonDisable, setDisableButton } from "../../utilities";
import setMonatJahr from "./setMonatJahr";

export default function changeMonatJahr(): void {
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");

	if (jahrInput && Storage.compare<number>("Jahr", Number(jahrInput.value))) {
		buttonDisable(false);
		if (!navigator.onLine) setDisableButton(true);

		if (monatInput && !Storage.compare<number>("Monat", Number(monatInput.value))) {
			const jahr = Number(jahrInput.value);
			const monat = Number(monatInput.value);
			Storage.set("Monat", monat);
			setMonatJahr(jahr, monat);
			// TODO: Warnung bei Monatswechsel
			changeMonat(undefined, monat);

			createSnackBar({
				message: `Monat geändert.`,
				status: "success",
				timeout: 3000,
				fixed: true,
			});
		}

		return;
	} else changeMonat([]);

	buttonDisable(true);
	const auswaehlenBtn = document.querySelector<HTMLButtonElement>("#btnAuswaehlen");
	if (navigator.onLine && auswaehlenBtn) auswaehlenBtn.disabled = false;
}

function changeMonat(data?: IDatenBZ[] | IDatenBE[] | IDatenEWT[] | IDatenN[], monat?: number) {
	document.querySelector<CustomHTMLTableElement>("#tableBZ")?.instance.rows.load(DataBZ(data as IDatenBZ[], monat));
	document.querySelector<CustomHTMLTableElement>("#tableBE")?.instance.rows.load(DataBE(data as IDatenBE[], monat));
	document.querySelector<CustomHTMLTableElement>("#tableE")?.instance.rows.load(DataE(data as IDatenEWT[], monat));
	document.querySelector<CustomHTMLTableElement>("#tableN")?.instance.rows.load(DataN(data as IDatenN[], monat));
}
