import { DataBZ, saveTableDataBE } from ".";
import { aktualisiereBerechnung } from "../../Berechnung";
import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenBZJahr } from "../../interfaces";
import { Storage, clearLoading, setLoading, tableToArray } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import BereitschaftEingabe from "./BereitschaftEingabe";

export default function BerEinsatzEingabe($modal: HTMLDivElement): void {
	setLoading("btnESE");

	const datumInput = $modal.querySelector<HTMLInputElement>("#Datum");
	const sapnrInput = $modal.querySelector<HTMLInputElement>("#SAPNR");
	const vonInput = $modal.querySelector<HTMLInputElement>("#ZeitVon");
	const bisInput = $modal.querySelector<HTMLInputElement>("#ZeitBis");
	const lreSelect = $modal.querySelector<HTMLSelectElement>("#LRE");
	const privatkmInput = $modal.querySelector<HTMLInputElement>("#privatkm");
	const berZeitInput = $modal.querySelector<HTMLInputElement>("#berZeit");
	const tableBE = document.querySelector<CustomHTMLTableElement<IDatenBE>>("#tableBE");
	const tableBZ = document.querySelector<CustomHTMLTableElement<IDatenBZ>>("#tableBZ");

	if (
		!datumInput ||
		!sapnrInput ||
		!vonInput ||
		!bisInput ||
		!lreSelect ||
		!privatkmInput ||
		!berZeitInput ||
		!tableBE ||
		!tableBZ
	)
		throw new Error("Input Element nicht gefunden");

	const daten: IDatenBE = {
		tagBE: dayjs(datumInput.value).format("DD.MM.YYYY"),
		auftragsnummerBE: sapnrInput.value,
		beginBE: vonInput.value,
		endeBE: bisInput.value,
		lreBE: lreSelect.value,
		privatkmBE: Number(privatkmInput.value),
	};

	const berZeit: boolean = berZeitInput.checked;

	console.log(daten);
	const ftBE = tableBE.instance;
	ftBE.rows.add(daten);
	saveTableDataBE(ftBE);

	if (berZeit) {
		daten.tagBE = datumInput.value;
		const bereitschaftsAnfang = dayjs(`${daten.tagBE}T${daten.beginBE}`),
			bereitschaftsEnde = dayjs(`${daten.tagBE}T${daten.endeBE}`).isBefore(bereitschaftsAnfang)
				? dayjs(`${daten.tagBE}T${daten.endeBE}`).add(1, "d")
				: dayjs(`${daten.tagBE}T${daten.endeBE}`),
			dataTable = tableToArray<IDatenBZ>("tableBZ");

		const monat: number = bereitschaftsAnfang.month() + 1;

		const data: false | IDatenBZ[] = BereitschaftEingabe(
			bereitschaftsAnfang,
			bereitschaftsEnde,
			bereitschaftsEnde,
			bereitschaftsEnde,
			false,
			dataTable,
		);

		const savedData: IDatenBZJahr = Storage.get("dataBZ", { check: true });

		if (!data || savedData[monat].length === data.length) {
			clearLoading("btnESE");
			createSnackBar({
				message: "Bereitschaft<br/>Zeitraum bereits vorhanden!",
				status: "warning",
				timeout: 3000,
				fixed: true,
			});
			return;
		}

		savedData[monat] = data;
		Storage.set("dataBZ", savedData);
		tableBZ.instance.rows.load(DataBZ(data, monat));

		aktualisiereBerechnung();

		createSnackBar({
			message: "Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!",
			status: "success",
			timeout: 3000,
			fixed: true,
		});
	}

	clearLoading("btnESE");
}
