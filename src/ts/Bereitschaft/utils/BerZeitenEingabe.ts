import { Dayjs } from "dayjs";
import { BerZeitenBerechnen, DataBZ } from ".";
import { aktualisiereBerechnung } from "../../Berechnung";
import { createSnackBar } from "../../class/CustomSnackbar";
import type {
	CustomHTMLDivElement,
	CustomHTMLTableElement,
	IDatenBZ,
	IDatenBZJahr,
	IMonatsDaten,
	IVorgabenU,
	ReturnTypeSaveData,
	UserDatenServer,
} from "../../interfaces";
import { Storage, clearLoading, setLoading, tableToArray } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import dayjs from "../../utilities/configDayjs";

export default async function BerZeitenEingabe(
	modal: CustomHTMLDivElement<IDatenBZ>,
	accessToken: string,
): Promise<void> {
	setLoading("btnESZ");

	const bAInput = modal.querySelector<HTMLInputElement>("#bA");
	const bATInput = modal.querySelector<HTMLInputElement>("#bAT");
	const bEInput = modal.querySelector<HTMLInputElement>("#bE");
	const bETInput = modal.querySelector<HTMLInputElement>("#bET");
	const nachtInput = modal.querySelector<HTMLInputElement>("#nacht");
	const nAInput = modal.querySelector<HTMLInputElement>("#nA");
	const nATInput = modal.querySelector<HTMLInputElement>("#nAT");
	const nEInput = modal.querySelector<HTMLInputElement>("#nE");
	const nETInput = modal.querySelector<HTMLInputElement>("#nET");
	const MonatInput = document.querySelector<HTMLInputElement>("#Monat");
	const JahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	const tableBZ = document.querySelector<CustomHTMLTableElement<IDatenBZ>>("#tableBZ");

	if (
		!bAInput ||
		!bATInput ||
		!bEInput ||
		!bETInput ||
		!nachtInput ||
		!nAInput ||
		!nATInput ||
		!nEInput ||
		!nETInput ||
		!MonatInput ||
		!JahrInput ||
		!tableBZ
	)
		throw new Error("Input Element nicht gefunden");

	const bereitschaftsAnfang: Dayjs = dayjs(`${bAInput.value}T${bATInput.value}`);
	const bereitschaftsEnde: Dayjs = dayjs(`${bEInput.value}T${bETInput.value}`);
	let nacht: boolean = nachtInput.checked;
	const nachtAnfang: Dayjs = nacht === true ? dayjs(`${nAInput.value}T${nATInput.value}`) : bereitschaftsEnde;
	let nachtEnde: Dayjs = nacht === true ? dayjs(`${nEInput.value}T${nETInput.value}`) : bereitschaftsEnde;

	const monat: number = +MonatInput.value;
	const jahr: number = +JahrInput.value;

	const savedData: IDatenBZJahr = Storage.get("dataBZ", { check: true });

	let data: IMonatsDaten["BZ"] | false = false;
	const data1: IMonatsDaten["BZ"] = tableToArray("tableBZ");
	let data2: IMonatsDaten["BZ"] | false = false;
	if (!data1) throw new Error("Fehler bei Datenermittlung");
	console.log({ bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, monat, jahr, accessToken });

	if (
		bereitschaftsAnfang.isSame(bereitschaftsEnde, "month") ||
		(!bereitschaftsAnfang.isSame(bereitschaftsEnde, "month") &&
			bereitschaftsEnde.isSameOrBefore(dayjs([jahr, bereitschaftsEnde.month(), 1, 0, 0])))
	) {
		let nachtEnde2: Dayjs = bereitschaftsEnde.isSameOrBefore(nachtEnde, "month")
			? nachtEnde
			: bereitschaftsEnde.hour(nachtEnde.hour()).minute(nachtEnde.minute());

		data = BerZeitenBerechnen(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde2, nacht, data1);
	} else if (!bereitschaftsAnfang.isSame(bereitschaftsEnde, "y") && !navigator.onLine) {
		createSnackBar({
			message: "Bereitschaft<br/>Du bist Offline: <br/>Kein Jahreswechsel möglich!",
			icon: "question",
			status: "error",
			dismissible: false,
			timeout: false,
			actions: [
				{
					text: "ohne wechsel fortsetzten?",
					function: () => {
						if (!data1) throw new Error("Fehler bei Datenermittlung");
						data = BerZeitenBerechnen(
							bereitschaftsAnfang,
							dayjs([bereitschaftsEnde.year(), bereitschaftsEnde.month()]),
							nachtAnfang,
							nachtEnde,
							nacht,
							data1,
						);
						if (!data) {
							clearLoading("btnESZ");
							createSnackBar({
								message: "Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!",
								icon: "!",
								status: "warning",
								timeout: 3000,
								fixed: true,
							});
							return;
						}

						savedData[monat] = data;
						Storage.set("dataBZ", savedData);
						tableBZ.instance.rows.load(DataBZ(data, monat));

						clearLoading("btnESZ");
						createSnackBar({
							message:
								"Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert.",
							status: "success",
							timeout: 3000,
							fixed: true,
						});
					},
					dismiss: true,
					class: ["text-primary"],
				},
				{
					text: "Abbrechen",
					function: () => {
						clearLoading("btnESZ");
					},
					dismiss: true,
				},
			],
			fixed: true,
		});
		return;
	} else {
		const monat2: number = bereitschaftsEnde.month();
		const jahr2: number = bereitschaftsEnde.year();

		const bereitschaftsEndeWechsel: Dayjs = dayjs([jahr2, monat2]);
		let nacht2: boolean = false;
		let nachtEnde1: Dayjs;
		let nachtEnde2: Dayjs = nachtEnde.clone();
		let nachtAnfang2: Dayjs;
		if (bereitschaftsEndeWechsel.isBefore(nachtAnfang)) {
			[nacht, nacht2] = [nacht2, nacht];
			nachtEnde1 = nachtEnde.clone();
			nachtAnfang2 = nachtAnfang.clone();
		} else if (bereitschaftsEndeWechsel.isAfter(nachtEnde)) {
			nachtEnde1 = nachtEnde.clone();
			nachtAnfang2 = bereitschaftsEnde.clone();
		} else if (bereitschaftsEndeWechsel.isAfter(nachtAnfang) && bereitschaftsEndeWechsel.isBefore(nachtEnde)) {
			nacht2 = nacht;
			nachtEnde1 = dayjs([jahr2, monat2, 1, nachtEnde.hour(), nachtEnde.minute()]);
			nachtAnfang2 = dayjs([jahr2, monat2, 1, nachtAnfang.hour(), nachtAnfang.minute()]).subtract(1, "day");
		} else throw new Error("Fehler bei Nacht und Bereitschaft");

		if (jahr !== jahr2) {
			try {
				const fetched2 = await FetchRetry<null, UserDatenServer>(jahr2.toString());
				if (fetched2 instanceof Error) throw fetched2;
				if (fetched2.statusCode != 200) {
					console.log("Fehler:", fetched2.message);
					createSnackBar({
						message: "Bereitschaft<br/>Es ist ein Fehler beim Jahreswechsel aufgetreten",
						status: "error",
						timeout: 3000,
						fixed: true,
					});
					return;
				}
				const dataResponded = fetched2.data.BZ;
				console.log(dataResponded);
				const User: IVorgabenU = fetched2.data.vorgabenU;

				data2 = BerZeitenBerechnen(
					bereitschaftsEndeWechsel,
					bereitschaftsEnde,
					nachtAnfang2,
					nachtEnde2,
					nacht2,
					dataResponded[1],
				);

				if (!data2) return;

				dataResponded[1] = data2;

				const dataSave: { BZ: IDatenBZJahr; User: IVorgabenU; Jahr: number } = {
					BZ: dataResponded,
					Jahr: jahr2,
					User,
				};

				const fetchedSave = await FetchRetry<typeof dataSave, ReturnTypeSaveData>("saveData", dataSave, "POST");
				if (fetchedSave instanceof Error) throw fetchedSave;
				if (fetchedSave.statusCode != 200) {
					console.log("Fehler:", fetchedSave.message);
					createSnackBar({
						message: "Bereitschaft<br/>Es ist ein Fehler beim Jahreswechsel aufgetreten",
						status: "error",
						timeout: 3000,
						fixed: true,
					});
					return;
				}
				console.log(fetchedSave.data);
				createSnackBar({
					message: `Bereitschaft<br/>Daten für 01/${jahr2} gespeichert`,
					status: "success",
					timeout: 3000,
					fixed: true,
				});
			} catch (err) {
				console.log(err);
				return;
			}
		} else {
			data2 = Storage.get<IDatenBZJahr>("dataBZ", { check: true })[monat2 + 1] ?? [];
			data2 = BerZeitenBerechnen(bereitschaftsEndeWechsel, bereitschaftsEnde, nachtAnfang2, nachtEnde2, nacht2, data2);
			if (data2) savedData[monat2 + 1] = data2;
		}

		data = BerZeitenBerechnen(bereitschaftsAnfang, bereitschaftsEndeWechsel, nachtAnfang, nachtEnde1, nacht, data1);

		console.log("Daten Monat 1", data);
		console.log("Daten Monat 2", data2);
	}

	if (!data) {
		clearLoading("btnESZ");
		createSnackBar({
			message: "Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!",
			status: "warning",
			timeout: 3000,
			fixed: true,
		});
		return;
	}

	savedData[monat] = data;
	Storage.set("dataBZ", savedData);
	tableBZ.instance.rows.load(DataBZ(data, monat));

	aktualisiereBerechnung(jahr);

	clearLoading("btnESZ");
	createSnackBar({
		message: "Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!",
		status: "success",
		timeout: 3000,
		fixed: true,
	});
}
