import { createSnackBar } from "../../class/CustomSnackbar";
import type { IVorgabenU, IVorgabenUPers, IVorgabenUaZ, IVorgabenUvorgabenB } from "../../interfaces";
import { Storage, tableToArray } from "../../utilities";

export default function saveEinstellungen(): IVorgabenU {
	const VorgabenU: IVorgabenU = Storage.get("VorgabenU", { check: true });

	const updateVorgabenU = <T, K extends keyof T>(obj: T, key: K, value: T[K]): void => {
		obj[key] = value;
	};

	for (const key of Object.keys(VorgabenU.pers)) {
		const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`);
		if (input) updateVorgabenU(VorgabenU.pers, key as keyof IVorgabenUPers, input.value);
	}

	for (const key of Object.keys(VorgabenU.aZ)) {
		const input = document.querySelector<HTMLInputElement>(`#${key}`);
		if (input) updateVorgabenU(VorgabenU.aZ, key as keyof IVorgabenUaZ, input.value);
	}

	VorgabenU.fZ = table_to_array_einstellungen("TbodyTätigkeitsstätten");

	const nebenTab = document.querySelector<HTMLDivElement>("#neben-tab")?.parentElement as HTMLLIElement;
	if (VorgabenU.pers.TB === "Tarifkraft") nebenTab?.classList.remove("d-none");
	else nebenTab?.classList.add("d-none");

	VorgabenU.vorgabenB = Object.fromEntries(tableToArray("tableVE").entries()) as { [key: string]: IVorgabenUvorgabenB };

	Storage.set("VorgabenU", VorgabenU);

	return VorgabenU;
}

function table_to_array_einstellungen(table_id: string): { key: string; text: string; value: string }[] | [] {
	const myData = document.querySelector<HTMLTableElement>(`#${table_id}`)?.rows;
	if (!myData) return [];
	const my_liste: { key: string; text: string; value: string }[] = [];
	for (const myDatum of Array.from(myData)) {
		const el = myDatum.children;
		const key: string = (<HTMLInputElement>el[0].children[0]).value;
		if (!key) continue;

		const text: string = (<HTMLInputElement>el[1].children[0]).value;
		const value: string = (<HTMLInputElement>el[2].children[0]).value;
		if (!text || !value) {
			createSnackBar({
				message: `Einstellungen > Fahrzeiten > "${key}": Beschreibung / Fahrzeit fehlt`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			throw new Error("Beschreibung / Fahrzeit fehlt");
		}
		my_liste.push({ key, text, value });
	}

	return my_liste;
}
