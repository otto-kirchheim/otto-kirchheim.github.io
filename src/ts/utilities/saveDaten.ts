import { Storage, buttonDisable, clearLoading, saveTableData, setLoading } from ".";
import { generateTableBerechnung } from "../Berechnung";
import { DataBE, DataBZ } from "../Bereitschaft/utils";
import { DataE } from "../EWT/utils";
import { generateEingabeMaskeEinstellungen, saveEinstellungen } from "../Einstellungen/utils";
import { DataN } from "../Neben/utils";
import { createSnackBar } from "../class/CustomSnackbar";
import { CustomHTMLTableElement, IDaten, IVorgabenBerechnung, IVorgabenU } from "../interfaces";
import { FetchRetry } from "./FetchRetry";

// type SaveData = {
// 	BZ: IDaten["BZ"];
// 	BE: IDaten["BE"];
// 	E: IDaten["EWT"];
// 	N: IDaten["N"];
// 	User: IVorgabenU;
// 	Jahr: number;
// };

type SaveData = {
	BZ: IDaten["BZ"];
	BE: IDaten["BE"];
	E: IDaten["EWT"];
	N: IDaten["N"];
	User: IVorgabenU;
	Monat: number;
	Jahr: number;
};

type ReturnTypeSaveData = {
	datenBerechnung: IVorgabenBerechnung;
	daten: {
		datenBZ: IDaten["BZ"];
		datenBE: IDaten["BE"];
		datenE: IDaten["EWT"];
		datenN: IDaten["N"];
	};
	user: IVorgabenU;
};

function findCustomTableInstance(id: string): CustomHTMLTableElement["instance"] {
	const table = document.querySelector<CustomHTMLTableElement>(`#${id}`);
	if (!table) throw new Error(`Custom table ${id} not found`);
	return table.instance;
}

export default async function saveDaten(button: HTMLButtonElement | null): Promise<void> {
	if (button === null) return;
	setLoading(button.id);
	buttonDisable(true);

	try {
		const [ftBZ, ftBE, ftE, ftN] = ["tableBZ", "tableBE", "tableE", "tableN"].map(findCustomTableInstance);

		const data: SaveData = {
			BZ: saveTableData(ftBZ),
			BE: saveTableData(ftBE),
			E: saveTableData(ftE),
			N: saveTableData(ftN),
			User: saveEinstellungen(),
			Monat: Storage.get("Monat"),
			Jahr: Storage.get("Jahr"),
		};

		const fetched = await FetchRetry<SaveData, ReturnTypeSaveData>("saveData", data, "POST");

		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode != 200) {
			console.error("Fehler", fetched.message);
			const messages = JSON.parse(fetched.message);
			createSnackBar({
				message: "Speichern<br/>Es ist ein Fehler aufgetreten:" + messages.map((message: string) => `<br/>- ${message}`),
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		}

		const dataResponded = fetched.data;
		console.log(dataResponded);

		generateTableBerechnung(dataResponded.datenBerechnung);

		const tables = [
			{ ft: ftBZ, data: DataBZ(dataResponded.daten.datenBZ) },
			{ ft: ftBE, data: DataBE(dataResponded.daten.datenBE) },
			{ ft: ftE, data: DataE(dataResponded.daten.datenE) },
			{ ft: ftN, data: DataN(dataResponded.daten.datenN) },
		];

		tables.forEach(({ ft, data }) => {
			ft.rows.load(data);
			saveTableData(ft);
			console.log("saved", ft);
		});

		generateEingabeMaskeEinstellungen(dataResponded.user);
		Storage.set("VorgabenU", dataResponded.user);
		Storage.set("datenBerechnung", dataResponded.datenBerechnung);

		console.log("Erfolgreich gespeichert");
		createSnackBar({
			message: `Speichern<br/>Daten gespeichert`,
			status: "success",
			timeout: 3000,
			fixed: true,
		});
	} catch (err) {
		console.error(err);
		return;
	} finally {
		clearLoading(button.id);
		buttonDisable(false);
	}
}
