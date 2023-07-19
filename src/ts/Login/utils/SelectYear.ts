import { Storage, setLoading } from "../../utilities";
import { setMonatJahr, LadeUserDaten } from ".";

export default function SelectYear(monat?: number, jahr?: number): void {
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	if (!monatInput) throw new Error("Monats Input nicht gefunden");
	if (!monat) monat = +monatInput.value;

	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	if (!jahrInput) throw new Error("Jahres Input nicht gefunden");
	if (!jahr) jahr = +jahrInput.value;

	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) throw new Error("Error Nachrichtenfeld nicht gefunden");

	setLoading("btnAuswaehlen");
	errorMessage.innerHTML = "";

	if (Storage.check("Jahr") && Storage.check("Monat"))
		if (Storage.get<number>("Jahr") != jahr) Storage.set("jahreswechsel", true);

	Storage.set("Jahr", jahr);
	Storage.set("Monat", monat);

	setMonatJahr(jahr, monat);

	if (!Storage.check("accessToken")) return;

	LadeUserDaten(monat, jahr).catch((err: Error) => {
		throw err;
	});
}
