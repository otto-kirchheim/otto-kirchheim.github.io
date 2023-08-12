import { Storage, setLoading } from "../../utilities";
import { LadeUserDaten } from "../../Login/utils";
import setMonatJahr from "./setMonatJahr";

export default function SelectYear(monat?: number, jahr?: number): void {
	if (!monat) {
		const monatInput = document.querySelector<HTMLInputElement>("#Monat");
		if (!monatInput) throw new Error("Monats Input nicht gefunden");
		monat = +monatInput.value;
	}

	if (!jahr) {
		const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
		if (!jahrInput) throw new Error("Jahres Input nicht gefunden");
		jahr = +jahrInput.value;
	}

	setLoading("btnAuswaehlen");

	if (Storage.check("Jahr") && Storage.check("Monat"))
		if (!Storage.compare<number>("Jahr", jahr)) Storage.set("Jahreswechsel", true);

	Storage.set("Jahr", jahr);
	Storage.set("Monat", monat);

	setMonatJahr(jahr, monat);

	if (Storage.check("accessToken")) LadeUserDaten(monat, jahr);
}
