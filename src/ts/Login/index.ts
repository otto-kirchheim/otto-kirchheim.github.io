import { SelectYear } from "../Einstellungen/utils";
import { IVorgabenU } from "../interfaces";
import { Storage, decodeAccessToken } from "../utilities";
import { createModalLogin } from "./components";

window.addEventListener("load", () => {
	if (Storage.check("VorgabenU") && Storage.get<IVorgabenU>("VorgabenU", true).vorgabenB[0].endeB.Nwoche === undefined)
		Storage.remove("VorgabenU");

	const btnLogin = document.querySelector<HTMLButtonElement>("#btnLogin");
	btnLogin?.addEventListener("click", () => createModalLogin());

	const willkommenEl = document.querySelector<HTMLHeadingElement>("#Willkommen");
	const jahrEl = document.querySelector<HTMLInputElement>("#Jahr");
	const monatEl = document.querySelector<HTMLInputElement>("#Monat");
	const loginDisplayEl = document.querySelector<HTMLDivElement>("#loginDisplay");

	const nebenTab = document.querySelector<HTMLButtonElement>("#neben-tab");
	if (!nebenTab) throw new Error("Element nicht gefunden");
	const nebenTabEl = nebenTab.parentElement as HTMLLIElement;

	const adminEl = document.querySelector<HTMLDivElement>("#admin");
	const navmenuEl = document.querySelector<HTMLDivElement>("#navmenu");
	const btnNavmenuEl = document.querySelector<HTMLButtonElement>("#btn-navmenu");

	if (Storage.check("Benutzer") && Storage.check("accessToken")) {
		const benutzer: string = Storage.check("VorgabenU")
			? Storage.get<IVorgabenU>("VorgabenU", true).pers.Vorname
			: Storage.get<string>("Benutzer", true);
		if (!benutzer) throw new Error("Benutzer nicht gefunden");

		if (btnLogin) btnLogin.classList.add("d-none");

		if (willkommenEl) willkommenEl.innerHTML = `Hallo, ${benutzer}.`;
		if (loginDisplayEl) loginDisplayEl.classList.add("d-none");

		const jahr: number = Storage.get<number>("Jahr", { check: true });
		const monat: number = Storage.get<number>("Monat", { check: true });
		if (!jahr || !monat) throw new Error("Jahr oder Monat nicht erkannt");

		if (jahrEl) jahrEl.value = jahr.toString();
		if (monatEl) monatEl.value = monat.toString();

		console.log("Benutzer gefunden");

		const vorgabenU: IVorgabenU = Storage.get("VorgabenU", { check: true });
		if (vorgabenU && vorgabenU.pers.TB == "Tarifkraft" && nebenTabEl) nebenTabEl.classList.remove("d-none");

		if (Storage.check("accessToken"))
			if (adminEl && decodeAccessToken().Berechtigung & 2) adminEl.classList.remove("d-none");

		monatEl?.classList.remove("d-none");
		navmenuEl?.classList.remove("d-none");
		btnNavmenuEl?.classList.remove("d-none");

		if (navigator.onLine) SelectYear(monat, jahr);
	}
});
