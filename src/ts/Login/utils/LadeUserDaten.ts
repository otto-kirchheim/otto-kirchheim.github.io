import { SaveUserDatenUEberschreiben } from ".";
import { aktualisiereBerechnung } from "../../Berechnung";
import generateTableBerechnung from "../../Berechnung/generateTableBerechnung";
import { DataBE, DataBZ } from "../../Bereitschaft/utils/convertDaten";
import { DataE } from "../../EWT/utils/DataE";
import { generateEingabeMaskeEinstellungen } from "../../Einstellungen/utils";
import { DataN } from "../../Neben/utils";
import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLTableElement, IVorgabenUvorgabenB, UserDatenServer } from "../../interfaces";
import { Storage, buttonDisable, clearLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";

export default async function LadeUserDaten(monat: number, jahr: number): Promise<void> {
	let userData: UserDatenServer | undefined;
	let jahreswechsel: boolean = false;

	try {
		const fetched = await FetchRetry<undefined, UserDatenServer>(jahr.toString());
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode == 200) userData = fetched.data;
		else throw new Error(fetched.message);
	} catch (err) {
		console.error(err);
		createSnackBar({
			message: `Server <br/>Keine Verbindung zum Server oder Serverfehler.`,
			status: "error",
			timeout: 3000,
			fixed: true,
		});
		return;
	} finally {
		clearLoading("btnAuswaehlen");
	}

	console.log("Daten geladen: ", userData);
	const { datenGeld } = userData;
	let { vorgabenU, BZ, BE, EWT, N } = userData;

	const vorhanden: string[] = [];

	let dataServer: Partial<UserDatenServer> = {};
	if (Storage.check("dataServer")) {
		dataServer = Storage.get("dataServer");
		console.log("Unterschiede Server - Client | Bereits vorhanden", dataServer);
	}

	if (Storage.check("Jahreswechsel")) {
		jahreswechsel = true;
		Storage.remove("Jahreswechsel");
	}

	const saveDaten = <T extends UserDatenServer[K], D extends object[], K extends keyof UserDatenServer>(
		nameStorage: string,
		data: T,
		dataName: K,
		beschreibung: string,
		loadTable: false | { name: string; data: D } = false,
	): T => {
		if (!Storage.check(nameStorage)) {
			console.log(`${nameStorage} speichern, nicht vorhanden`);
			Storage.set(nameStorage, data);
			if (loadTable)
				document.querySelector<CustomHTMLTableElement>(`#${loadTable.name}`)?.instance.rows.load(loadTable.data);
		} else if (jahreswechsel === true) {
			console.log(`${nameStorage} speichern, Jahreswechsel`);
			Storage.set(nameStorage, data);
		} else if (!Storage.compare(nameStorage, data)) {
			console.log(`${nameStorage} vorhanden & änderungen`);
			if (!vorhanden.find(element => element === beschreibung)) vorhanden.push(beschreibung);
			dataServer[dataName] = data;
			return Storage.get<T>(nameStorage);
		}
		return data;
	};
	vorgabenU = saveDaten("VorgabenU", vorgabenU, "vorgabenU", "Persönliche Daten", {
		name: "tableVE",
		data: [...Object.values(vorgabenU.vorgabenB)] as IVorgabenUvorgabenB[],
	});
	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) {
		willkommen.innerHTML = `Hallo, ${vorgabenU.pers.Vorname}.`;
	}
	BZ = saveDaten("dataBZ", BZ, "BZ", "Bereitschaftszeit", {
		name: "tableBZ",
		data: DataBZ(BZ[monat], monat),
	});
	BE = saveDaten("dataBE", BE, "BE", "Bereitschaftseinsatz", {
		name: "tableBE",
		data: DataBE(BE[monat], monat),
	});
	EWT = saveDaten("dataE", EWT, "EWT", "EWT", {
		name: "tableE",
		data: DataE(EWT[monat], monat),
	});
	N = saveDaten("dataN", N, "N", "Nebenbezüge", {
		name: "tableN",
		data: DataN(N[monat], monat),
	});

	const datenBerechnung = aktualisiereBerechnung(jahr, { BZ, BE, EWT, N });
	Storage.set("VorgabenGeld", datenGeld);

	// TODO: Unterschiede auf Monat anpassen?
	if (vorhanden.length > 0) {
		if (Object.keys(dataServer).length > 0) console.log("Unterschiede Server - Client", dataServer);
		Storage.set("dataServer", dataServer);

		createSnackBar({
			message: `<b>Ungespeicherte Daten:</b> <br/>${vorhanden.join("<br/>")}`,
			status: "info",
			dismissible: false,
			timeout: false,
			fixed: true,
			actions: [
				{
					text: "Lokale Daten überschreiben",
					function: () => {
						SaveUserDatenUEberschreiben();
						clearLoading("btnAuswaehlen");
						buttonDisable(false);
					},
					dismiss: true,
					class: ["text-primary"],
				},
				{
					text: "Daten behalten",
					function: () => {
						Storage.remove("dataServer");
						clearLoading("btnAuswaehlen");
						buttonDisable(false);
					},
					dismiss: true,
					class: ["text-secondary"],
				},
			],
		});
	} else {
		clearLoading("btnAuswaehlen");
		buttonDisable(false);
	}

	if (!("BZ" in dataServer))
		document.querySelector<CustomHTMLTableElement>("#tableBZ")?.instance.rows.load(DataBZ(BZ[monat], monat));
	if (!("BE" in dataServer))
		document.querySelector<CustomHTMLTableElement>("#tableBE")?.instance.rows.load(DataBE(BE[monat], monat));
	if (!("EWT" in dataServer))
		document.querySelector<CustomHTMLTableElement>("#tableE")?.instance.rows.load(DataE(EWT[monat], monat));
	if (!("N" in dataServer))
		document.querySelector<CustomHTMLTableElement>("#tableN")?.instance.rows.load(DataN(N[monat], monat));
	if (!("vorgabenU" in dataServer))
		document
			.querySelector<CustomHTMLTableElement>("#tableVE")
			?.instance.rows.load([...Object.values(vorgabenU.vorgabenB)]);

	generateTableBerechnung(datenBerechnung, datenGeld);
	generateEingabeMaskeEinstellungen(vorgabenU);

	if (vorgabenU.pers.TB == "Tarifkraft")
		(<HTMLLIElement>document.querySelector<HTMLButtonElement>("#neben-tab")?.parentElement).classList.remove("d-none");
	document.querySelector<HTMLDivElement>("#navmenu")?.classList.remove("d-none");
	document.querySelector<HTMLButtonElement>("#btn-navmenu")?.classList.remove("d-none");
	createSnackBar({
		message: `Neue Daten geladen.`,
		status: "success",
		timeout: 3000,
		fixed: true,
	});
}
