import { SaveUserDatenUEberschreiben, setMonatJahr } from ".";
import generateTableBerechnung from "../../Berechnung/generateTableBerechnung";
import { DataBE, DataBZ } from "../../Bereitschaft/utils/convertDaten";
import { DataE } from "../../EWT/utils/DataE";
import { generateEingabeMaskeEinstellungen } from "../../Einstellungen/utils";
import { DataN } from "../../Neben/utils";
import { createSnackBar } from "../../class/CustomSnackbar";
import type {
	CustomHTMLTableElement,
	IDaten,
	IVorgabenBerechnung,
	IVorgabenGeld,
	IVorgabenU,
	IVorgabenUvorgabenB,
} from "../../interfaces";
import { Storage, buttonDisable, clearLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";

export default async function LadeUserDaten(monat: number, jahr: number): Promise<void> {
	setMonatJahr(jahr, monat);
	let user: {
		vorgabenU: IVorgabenU;
		datenGeld: IVorgabenGeld;
		datenBerechnung: IVorgabenBerechnung;
		datenB: { datenBZ: IDaten["BZ"]; datenBE: IDaten["BE"] };
		datenE: IDaten["EWT"];
		datenN: IDaten["N"];
	};
	try {
		const fetched = await FetchRetry<
			null,
			{
				vorgabenU: IVorgabenU;
				datenBerechnung: IVorgabenBerechnung;
				datenGeld: IVorgabenGeld;
				datenB: { datenBZ: IDaten["BZ"]; datenBE: IDaten["BE"] };
				datenE: IDaten["EWT"];
				datenN: IDaten["N"];
			}
		>(`${monat}&${jahr}`);
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode == 200) {
			user = fetched.data;
		} else {
			throw new Error(fetched.message);
		}
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

	const dataArray = user;

	console.log("Daten geladen: ", dataArray);
	const { datenBerechnung, datenGeld } = dataArray;
	let { vorgabenU } = dataArray;
	let dataBZ = dataArray.datenB.datenBZ;
	let dataBE = dataArray.datenB.datenBE;
	let dataE = dataArray.datenE;
	let dataN = dataArray.datenN;

	const vorhanden: string[] = [];

	let monatswechsel = false;

	if (Storage.check("monatswechsel")) {
		monatswechsel = true;
		Storage.remove("monatswechsel");
	}

	let dataServer: { [key: string]: unknown } = {};
	if (Storage.check("dataServer")) {
		dataServer = Storage.get("dataServer") ?? {};
		console.log("Unterschiede Server - Client | Bereits vorhanden", dataServer);
	}

	const saveDaten = <T, K extends object[]>(
		nameStorage: string,
		name: string,
		data: T,
		dataName: string,
		beschreibung: string,
		loadTable: false | { name: string; data: K } = false,
	): T => {
		if (!Storage.check(nameStorage)) {
			console.log(`${name} speichern, nicht vorhanden`);
			Storage.set(nameStorage, data);
			if (loadTable)
				document.querySelector<CustomHTMLTableElement>(`#${loadTable.name}`)?.instance.rows.load(loadTable.data);
		} else if (monatswechsel) {
			console.log(`${name} speichern`);
			Storage.set(nameStorage, data);
		} else if (!Storage.compare(nameStorage, data)) {
			console.log(`${name} vorhanden & änderungen`);
			if (!vorhanden.find(element => element == beschreibung)) vorhanden.push(beschreibung);
			dataServer[dataName] = data;
			return Storage.get<T>(nameStorage);
		}
		return data;
	};
	vorgabenU = saveDaten("VorgabenU", "VorgabenU", vorgabenU, "vorgabenU", "Persönliche Daten", {
		name: "tableVE",
		data: [...Object.values(vorgabenU.vorgabenB)] as IVorgabenUvorgabenB[],
	});
	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) {
		willkommen.innerHTML = `Hallo, ${vorgabenU.pers.Vorname}.`;
	}
	dataBZ = saveDaten("dataBZ", "DatenBZ", dataBZ, "dataBZ", "Bereitschaftszeit", {
		name: "tableBZ",
		data: DataBZ(dataBZ),
	});
	dataBE = saveDaten("dataBE", "DatenBE", dataBE, "dataBE", "Bereitschaftseinsatz", {
		name: "tableBE",
		data: DataBE(dataBE),
	});
	dataE = saveDaten("dataE", "DatenE", dataE, "dataE", "EWT", {
		name: "tableE",
		data: DataE(dataE),
	});
	dataN = saveDaten("dataN", "DatenN", dataN, "dataN", "Nebenbezüge", {
		name: "tableN",
		data: DataN(dataN),
	});

	Storage.set("datenBerechnung", datenBerechnung);
	Storage.set("VorgabenGeld", datenGeld);

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
						SaveUserDatenUEberschreiben(false);
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

	if (dataServer.dataBZ != null || monatswechsel)
		document.querySelector<CustomHTMLTableElement>("#tableBZ")?.instance.rows.load(DataBZ(dataBZ));
	if (dataServer.dataBE != null || monatswechsel)
		document.querySelector<CustomHTMLTableElement>("#tableBE")?.instance.rows.load(DataBE(dataBE));
	if (dataServer.dataE != null || monatswechsel)
		document.querySelector<CustomHTMLTableElement>("#tableE")?.instance.rows.load(DataE(dataE));
	if (dataServer.dataN != null || monatswechsel)
		document.querySelector<CustomHTMLTableElement>("#tableN")?.instance.rows.load(DataN(dataN));
	if (dataServer.dataVE != null || monatswechsel)
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
