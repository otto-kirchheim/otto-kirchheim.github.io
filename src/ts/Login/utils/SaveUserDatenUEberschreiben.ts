import { aktualisiereBerechnung } from "../../Berechnung";
import { DataBE, DataBZ } from "../../Bereitschaft/utils/convertDaten";
import { DataE } from "../../EWT/utils/DataE";
import { generateEingabeMaskeEinstellungen } from "../../Einstellungen/utils";
import { DataN } from "../../Neben/utils";
import type { CustomHTMLTableElement, UserDatenServer } from "../../interfaces";
import { Storage } from "../../utilities";

function applyDataToTable(selector: string, data: object[]): void {
	const table = document.querySelector<CustomHTMLTableElement>(selector);
	table?.instance.rows.load(data);
}

export default function SaveUserDatenUEberschreiben(): void {
	const dataServer: Partial<UserDatenServer> = Storage.get("dataServer") ?? {};
	console.log({ dataServer });

	const Monat = Storage.get<number>("Monat");

	if (dataServer.vorgabenU) {
		console.log("VorgabenU überschreiben");
		Storage.set("VorgabenU", dataServer.vorgabenU);
		applyDataToTable("#tableVE", [...Object.values(dataServer.vorgabenU.vorgabenB)]);
		generateEingabeMaskeEinstellungen(dataServer.vorgabenU);
		delete dataServer.vorgabenU;
	}
	if (dataServer.BZ) {
		console.log("DatenBZ überschreiben");
		Storage.set("dataBZ", dataServer.BZ);
		applyDataToTable("#tableBZ", DataBZ(dataServer.BZ[Monat], Monat));
		delete dataServer.BZ;
	}
	if (dataServer.BE) {
		console.log("DatenBE überschreiben");
		Storage.set("dataBE", dataServer.BE);
		applyDataToTable("#tableBE", DataBE(dataServer.BE[Monat], Monat));
		delete dataServer.BE;
	}
	if (dataServer.EWT) {
		console.log("DatenE überschreiben");
		Storage.set("dataE", dataServer.EWT);
		applyDataToTable("#tableE", DataE(dataServer.EWT[Monat], Monat));
		delete dataServer.EWT;
	}
	if (dataServer.N) {
		console.log("DatenN überschreiben");
		Storage.set("dataN", dataServer.N);
		applyDataToTable("#tableN", DataN(dataServer.N[Monat], Monat));
		delete dataServer.N;
	}
	aktualisiereBerechnung();

	Storage.remove("dataServer");
}
