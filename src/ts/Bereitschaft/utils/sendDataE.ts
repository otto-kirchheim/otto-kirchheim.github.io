import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLTableElement, IDatenBZ } from "../../interfaces";
import { Storage, clearLoading, saveTableData, setLoading, tableToArray } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import BereitschaftEingabe from "./BereitschaftEingabe";
import { DataBZ } from "./convertDaten";

export default function sendDataE($modal: HTMLDivElement): void {
	setLoading("btnESE");

	const datumInput = $modal.querySelector<HTMLInputElement>("#Datum");
	const sapnrInput = $modal.querySelector<HTMLInputElement>("#SAPNR");
	const vonInput = $modal.querySelector<HTMLInputElement>("#ZeitVon");
	const bisInput = $modal.querySelector<HTMLInputElement>("#ZeitBis");
	const lreSelect = $modal.querySelector<HTMLSelectElement>("#LRE");
	const privatkmInput = $modal.querySelector<HTMLInputElement>("#privatkm");
	const berZeitInput = $modal.querySelector<HTMLInputElement>("#berZeit");
	const tableBE = document.querySelector<CustomHTMLTableElement>("#tableBE");
	const tableBZ = document.querySelector<CustomHTMLTableElement>("#tableBZ");

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
	) {
		throw new Error("Input Element nicht gefunden");
	}

	const daten = {
		tagBE: dayjs(datumInput.value).format("DD.MM.YYYY"),
		auftragsnummerBE: sapnrInput.value,
		beginBE: vonInput.value,
		endeBE: bisInput.value,
		lreBE: lreSelect.value,
		privatkmBE: Number(privatkmInput.value),
	};

	const berZeit = berZeitInput.checked;

	console.log(daten);
	const ftBE = tableBE.instance;
	ftBE.rows.add(daten);
	saveTableData(ftBE);

	sapnrInput.value = "";
	vonInput.value = "";
	bisInput.value = "";
	privatkmInput.value = "";
	berZeitInput.checked = false;
	lreSelect.value = "";

	if (berZeit) {
		daten.tagBE = datumInput.value;
		const bereitschaftsAnfang = dayjs(`${daten.tagBE}T${daten.beginBE}`),
			bereitschaftsEnde = dayjs(`${daten.tagBE}T${daten.endeBE}`).isBefore(bereitschaftsAnfang)
				? dayjs(`${daten.tagBE}T${daten.endeBE}`).add(1, "d")
				: dayjs(`${daten.tagBE}T${daten.endeBE}`),
			dataTable = tableToArray<IDatenBZ>("tableBZ");

		const data = BereitschaftEingabe(
			bereitschaftsAnfang,
			bereitschaftsEnde,
			bereitschaftsEnde,
			bereitschaftsEnde,
			false,
			dataTable,
		);

		if (!data) {
			clearLoading("btnESE");
			createSnackBar({
				message: "Bereitschaft<br/>Zeitraum bereits vorhanden!",
				status: "warning",
				timeout: 3000,
				fixed: true,
			});
			return;
		}

		Storage.set("dataBZ", data);
		tableBZ.instance.rows.load(DataBZ(data));
		createSnackBar({
			message:
				"Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert.",
			status: "success",
			timeout: 3000,
			fixed: true,
		});
	}

	clearLoading("btnESE");
}
