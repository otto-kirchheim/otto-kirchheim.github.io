import { saveAs } from "file-saver";
import { Storage, buttonDisable, clearLoading, setLoading, getServerUrl, abortController } from ".";
import { createSnackBar } from "../class/CustomSnackbar";
import { IMonatsDaten, IVorgabenGeld, IVorgabenGeldType, IVorgabenU } from "../interfaces";
import tableToArray from "./tableToArray";
import dayjs from "./configDayjs";

export default async function download(button: HTMLButtonElement | null, modus: "B" | "E" | "N"): Promise<void> {
	if (button === null) return;
	setLoading(button.id);
	buttonDisable(true);

	const MonatInput = document.querySelector<HTMLInputElement>("#Monat");
	const JahrInput = document.querySelector<HTMLInputElement>("#Jahr");

	if (!MonatInput || !JahrInput) throw new Error("Input Element nicht gefunden");

	const VorgabenGeldDaten: IVorgabenGeld = Storage.get("VorgabenGeld", { check: true });
	const VorgabenGeldHandler: ProxyHandler<IVorgabenGeld> = {
		get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
			const maxMonat: number = Number(prop);
			let returnObjekt = target[1];
			const keys = Object.keys(target).map(Number);
			if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
				for (let monat = 2; monat <= maxMonat; monat++)
					if (typeof target[monat] !== "undefined") returnObjekt = { ...returnObjekt, ...target[monat] };
			return returnObjekt;
		},
		set: (_target: IVorgabenGeld, prop: string, newValue) => {
			console.log("veränderung von datenGeld nicht erlaubt:", prop, newValue);
			return false;
		},
	};
	const VorgabenGeld = new Proxy(VorgabenGeldDaten, VorgabenGeldHandler);

	const Monat = +MonatInput.value;
	const Jahr = +JahrInput.value;
	const data = {
		VorgabenU: Storage.get<IVorgabenU>("VorgabenU", { check: true }),
		VorgabenGeld: VorgabenGeld[Monat],
		Daten: {} as Partial<IMonatsDaten>,
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

		let accessToken = Storage.get<string>("accessToken", { check: true });
		const serverUrl = await getServerUrl();

		const fetchObject: RequestInit = {
			mode: "cors",
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			signal: abortController.signal,
			body: JSON.stringify(data),
			cache: "no-cache",
		};

		const response = await fetch(`${serverUrl}/download/${modus}`, fetchObject);

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Fehler", errorData.message);
			createSnackBar({
				message: `Download fehlerhaft:<br/>${errorData.message}`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		}
		const blob = await response.blob();

		await response.headers.forEach(value => console.log(value));

		const contentDisposition = response.headers.get("content-disposition");

		let dateiName: string | undefined;
		if (contentDisposition) {
			const matches = /filename="([^"]+)"/.exec(contentDisposition);
			if (matches?.[1]) dateiName = matches[1];
		}
		if (!dateiName) {
			console.error("Fehler", "Dateiname fehlt");
			createSnackBar({
				message: `Download fehlerhaft:<br/>Dateiname fehlt`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});

			const vorDateiName: { [key in typeof modus]: string } = {
				B: "RB",
				E: "Verpfl",
				N: "EZ",
			};

			dateiName = `${vorDateiName[modus]}_${dayjs([Jahr, Monat - 1, 1]).format("MM_YY")}_${data.VorgabenU.pers.Vorname} ${
				data.VorgabenU.pers.Nachname
			}_${data.VorgabenU.pers.Gewerk} ${data.VorgabenU.pers.ErsteTkgSt}.pdf`;
		}

		saveAs(blob, dateiName);
	} catch (error: any) {
		console.error("Fehler", error.message ?? error);
		createSnackBar({
			message: `Download fehlerhaft:<br/>${error.message ?? error}`,
			status: "error",
			timeout: 3000,
			fixed: true,
		});
	} finally {
		console.timeEnd("download");
		buttonDisable(false);
		clearLoading(button.id);
	}
}
