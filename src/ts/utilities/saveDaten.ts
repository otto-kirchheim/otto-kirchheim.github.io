import { FetchRetry, Storage, buttonDisable, clearLoading, setLoading } from ".";
import { aktualisiereBerechnung } from "../Berechnung";
import { DataBE, DataBZ, saveTableDataBE, saveTableDataBZ } from "../Bereitschaft/utils";
import { DataE, saveTableDataEWT } from "../EWT/utils";
import { generateEingabeMaskeEinstellungen, saveEinstellungen } from "../Einstellungen/utils";
import { DataN, saveTableDataN } from "../Neben/utils";
import { createSnackBar } from "../class/CustomSnackbar";
import { CustomTableTypes } from "../class/CustomTable";
import type {
	AtLeastOne,
	CustomHTMLTableElement,
	IDaten,
	IDatenBE,
	IDatenBZ,
	IDatenEWT,
	IDatenN,
	IVorgabenU,
	ReturnTypeSaveData,
} from "../interfaces";

interface SaveData {
	User: IVorgabenU;
	Jahr: number;
}

function findCustomTableInstance<T extends CustomTableTypes>(id: string): CustomHTMLTableElement<T>["instance"] {
	const table = document.querySelector<CustomHTMLTableElement<T>>(`#${id}`);
	if (!table) throw new Error(`Custom table ${id} not found`);
	return table.instance;
}

export default async function saveDaten(button: HTMLButtonElement | null, Monat?: number): Promise<void> {
	if (button === null) return;
	setLoading(button.id);
	buttonDisable(true);
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });

	try {
		const ftBZ = findCustomTableInstance<IDatenBZ>("tableBZ");
		const ftBE = findCustomTableInstance<IDatenBE>("tableBE");
		const ftE = findCustomTableInstance<IDatenEWT>("tableE");
		const ftN = findCustomTableInstance<IDatenN>("tableN");

		const data: SaveData & AtLeastOne<IDaten> = {
			BZ: saveTableDataBZ(ftBZ, Monat),
			BE: saveTableDataBE(ftBE, Monat),
			EWT: saveTableDataEWT(ftE, Monat),
			N: saveTableDataN(ftN, Monat),
			User: saveEinstellungen(),
			Jahr: Storage.get("Jahr", { check: true }),
		};

		const fetched = await FetchRetry<SaveData & AtLeastOne<IDaten>, ReturnTypeSaveData>("saveData", data, "POST");

		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode != 200) {
			console.error("Fehler", fetched.message);
			let messages;
			try {
				messages = JSON.parse(fetched.message);
			} catch (error: unknown) {
				console.log(error, fetched.message);
				messages = fetched.message ?? "unbekannter Fehler";
			} finally {
				messages =
					typeof fetched.message == "object" ? messages.map((message: string) => `<br/>- ${message}`) : fetched.message;
			}

			createSnackBar({
				message: `Speichern<br/>Es ist ein Fehler aufgetreten: ${messages}`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		}

		const dataResponded = fetched.data;
		console.log(dataResponded);

		aktualisiereBerechnung(data.Jahr, dataResponded.daten);

		Storage.set("dataBZ", dataResponded.daten.BZ);
		ftBZ.rows.load(DataBZ(dataResponded.daten.BZ[Monat]));
		console.log("saved", ftBZ);

		Storage.set("dataBE", dataResponded.daten.BE);
		ftBE.rows.load(DataBE(dataResponded.daten.BE[Monat]));
		console.log("saved", ftBE);

		Storage.set("dataE", dataResponded.daten.EWT);
		ftE.rows.load(DataE(dataResponded.daten.EWT[Monat]));
		console.log("saved", ftE);

		if (data.Jahr >= 2024) {
			Storage.set("dataN", dataResponded.daten.N);
			ftN.rows.load(DataN(dataResponded.daten.N[Monat]));
			console.log("saved", ftN);
		} else console.log("not saved (Jahr < 2024", ftN);

		generateEingabeMaskeEinstellungen(dataResponded.user);
		Storage.set("VorgabenU", dataResponded.user);

		console.log("Erfolgreich gespeichert");
		createSnackBar({
			message: `Speichern<br/>Daten gespeichert`,
			status: "success",
			timeout: 3000,
			fixed: true,
		});
	} catch (err: unknown) {
		console.error(err);
		return;
	} finally {
		clearLoading(button.id);
		buttonDisable(false);
	}
}
