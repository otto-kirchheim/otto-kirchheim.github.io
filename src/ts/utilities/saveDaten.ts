import { Storage, buttonDisable, clearLoading, saveTableData, setLoading } from ".";
import { aktualisiereBerechnung, generateTableBerechnung } from "../Berechnung";
import { DataBE, DataBZ } from "../Bereitschaft/utils";
import { DataE } from "../EWT/utils";
import { generateEingabeMaskeEinstellungen, saveEinstellungen } from "../Einstellungen/utils";
import { DataN } from "../Neben/utils";
import { createSnackBar } from "../class/CustomSnackbar";
import { CustomHTMLTableElement, IDaten, IVorgabenBerechnung, IVorgabenU } from "../interfaces";
import { FetchRetry } from "./FetchRetry";

interface SaveData extends IDaten {
	User: IVorgabenU;
	Jahr: number;
}

type ReturnTypeSaveData = {
	datenBerechnung: IVorgabenBerechnung | false;
	daten: IDaten;
	user: IVorgabenU;
};

function findCustomTableInstance(id: string): CustomHTMLTableElement["instance"] {
	const table = document.querySelector<CustomHTMLTableElement>(`#${id}`);
	if (!table) throw new Error(`Custom table ${id} not found`);
	return table.instance;
}

export default async function saveDaten(button: HTMLButtonElement | null, Monat?: number): Promise<void> {
	if (button === null) return;
	setLoading(button.id);
	buttonDisable(true);
	if (!Monat) Monat = Storage.get<number>("Monat");

	try {
		const [ftBZ, ftBE, ftE, ftN] = ["tableBZ", "tableBE", "tableE", "tableN"].map(findCustomTableInstance);

		const data: SaveData = {
			BZ: saveTableData(ftBZ, Monat),
			BE: saveTableData(ftBE, Monat),
			EWT: saveTableData(ftE, Monat),
			N: saveTableData(ftN, Monat),
			User: saveEinstellungen(),
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
		if (dataResponded.datenBerechnung) {
			Storage.set("datenBerechnung", dataResponded.datenBerechnung);
			generateTableBerechnung(dataResponded.datenBerechnung);
		} else {
			generateTableBerechnung(aktualisiereBerechnung(undefined, dataResponded.daten));
		}

		const tables = [
			{ ft: ftBZ, storageKey: "dataBZ", dataJahr: dataResponded.daten.BZ, data: DataBZ(dataResponded.daten.BZ[Monat]) },
			{ ft: ftBE, storageKey: "dataBE", dataJahr: dataResponded.daten.BE, data: DataBE(dataResponded.daten.BE[Monat]) },
			{ ft: ftE, storageKey: "dataE", dataJahr: dataResponded.daten.EWT, data: DataE(dataResponded.daten.EWT[Monat]) },
			{ ft: ftN, storageKey: "dataN", dataJahr: dataResponded.daten.N, data: DataN(dataResponded.daten.N[Monat]) },
		];

		tables.forEach(({ ft, storageKey, dataJahr, data }) => {
			Storage.set(storageKey, dataJahr);
			ft.rows.load(data);
			console.log("saved", ft);
		});

		generateEingabeMaskeEinstellungen(dataResponded.user);
		Storage.set("VorgabenU", dataResponded.user);

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
