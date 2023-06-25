import { DataBE, DataBZ } from "../../Bereitschaft/utils/convertDaten";
import { DataE } from "../../EWT/utils/DataE";
import { generateEingabeMaskeEinstellungen } from "../../Einstellungen/utils";
import { DataN } from "../../Neben/utils";
import type { CustomHTMLTableElement, IDaten, IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from "../../interfaces";
import { Storage } from "../../utilities";

function applyDataToTable(selector: string, data: object[]): void {
	const table = document.querySelector<CustomHTMLTableElement>(selector);
	table?.instance.rows.load(data);
}

export default function SaveUserDatenUEberschreiben(ueberschreiben = true): void {
	if (!ueberschreiben) {
		Storage.remove("dataServer");
		return;
	}
	const dataServer: {
		vorgabenU?: IVorgabenU;
		datenGeld?: IVorgabenGeld;
		datenBerechnung?: IVorgabenBerechnung;
		dataBZ?: IDaten["BZ"];
		dataBE?: IDaten["BE"];
		dataE?: IDaten["EWT"];
		dataN?: IDaten["N"];
	} = Storage.get("dataServer");
	console.log({ dataServer });

	if (dataServer.vorgabenU) {
		console.log("VorgabenU überschreiben");
		Storage.set("VorgabenU", dataServer.vorgabenU);
		applyDataToTable("#tableVE", [...Object.values(dataServer.vorgabenU.vorgabenB)]);
		generateEingabeMaskeEinstellungen(dataServer.vorgabenU);
		delete dataServer.vorgabenU;
	}
	if (dataServer.dataBZ) {
		console.log("DatenBZ überschreiben");
		Storage.set("dataBZ", dataServer.dataBZ);
		applyDataToTable("#tableBZ", DataBZ(dataServer.dataBZ));
		delete dataServer.dataBZ;
	}
	if (dataServer.dataBE) {
		console.log("DatenBE überschreiben");
		Storage.set("dataBE", dataServer.dataBE);
		applyDataToTable("#tableBE", DataBE(dataServer.dataBE));
		delete dataServer.dataBE;
	}
	if (dataServer.dataE) {
		console.log("DatenE überschreiben");
		Storage.set("dataE", dataServer.dataE);
		applyDataToTable("#tableE", DataE(dataServer.dataE));
		delete dataServer.dataE;
	}
	if (dataServer.dataN) {
		console.log("DatenN überschreiben");
		Storage.set("dataN", dataServer.dataN);
		applyDataToTable("#tableN", DataN(dataServer.dataN));
		delete dataServer.dataN;
	}

	Storage.remove("dataServer");
}
