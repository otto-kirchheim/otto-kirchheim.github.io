import { saveAs } from "file-saver";
import { Storage, buttonDisable, clearLoading, setLoading } from ".";
import { createSnackBar } from "../class/CustomSnackbar";
import { IDaten, IVorgabenGeld, IVorgabenGeldType, IVorgabenU } from "../interfaces";
import { FetchRetry } from "./FetchRetry";
import convertToBlob from "./convertToBlob";
import tableToArray from "./tableToArray";

export default async function download(button: HTMLButtonElement | null, modus: "B" | "E" | "N"): Promise<void> {
	if (button === null) return;
	setLoading(button.id);
	buttonDisable(true);

	const MonatInput = document.querySelector<HTMLInputElement>("#Monat");
	const JahrInput = document.querySelector<HTMLInputElement>("#Jahr");

	if (!MonatInput || !JahrInput) throw new Error("Input Element nicht gefunden");

	const VorgabenGeld: IVorgabenGeld = Storage.get("VorgabenGeld");
	Object.setPrototypeOf(VorgabenGeld, {
		getMonat: function (maxMonat: number): IVorgabenGeldType {
			let returnObjekt = VorgabenGeld[1];
			const keys = Object.keys(VorgabenGeld).map(Number);
			if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1) {
				for (let monat = 2; monat <= maxMonat; monat++) {
					if (typeof VorgabenGeld[monat] !== "undefined") returnObjekt = { ...returnObjekt, ...VorgabenGeld[monat] };
				}
			}
			return returnObjekt;
		},
	});
	const Monat = +MonatInput.value;
	const Jahr = +JahrInput.value;
	const data = {
		VorgabenU: Storage.get<IVorgabenU>("VorgabenU"),
		VorgabenGeld: VorgabenGeld.getMonat(Monat),
		Daten: {} as IDaten, // IMonatsdaten
		Monat,
		Jahr,
	};

	switch (modus) {
		case "B":
			data.Daten.BZ = tableToArray("tableBZ");
			data.Daten.BE = tableToArray("tableBE");
			break;
		case "E":
			data.Daten.EWT = tableToArray("tableE");
			break;
		case "N":
			data.Daten.N = tableToArray("tableN");
			break;
		default:
			throw new Error("Modus fehlt");
	}

	try {
		console.time("download");
		const fetched = await FetchRetry<
			{
				VorgabenU: IVorgabenU;
				VorgabenGeld: IVorgabenGeldType;
				Daten: Partial<IDaten>; // IMonatsdaten
				Monat: number;
				Jahr: number;
			},
			{ data: string; name: string }
		>(`download/${modus}`, data, "POST");
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode != 200) {
			console.error("Fehler", fetched.message);
			createSnackBar({
				message: `Download fehlerhaft:<br/>${fetched.message}`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		}
		saveAs(convertToBlob(fetched.data.data), fetched.data.name);
	} catch (err) {
		console.error(err);
		return;
	} finally {
		console.timeEnd("download");
		buttonDisable(false);
		clearLoading(button.id);
	}
}
