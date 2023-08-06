import { Logout, SelectYear } from "../Einstellungen/utils";
import { createSnackBar } from "../class/CustomSnackbar";
import { IVorgabenU } from "../interfaces";
import { Storage, decodeAccessToken } from "../utilities";
import { createModalLogin } from "./components";

window.addEventListener("load", () => {
	if (Storage.size() > 3 && Storage.check("UserID")) {
		const benutzer = Storage.get<string>("Benutzer");
		Logout();
		createSnackBar({
			message: `Hallo ${benutzer},<br/>die App hat ein Update erhalten.<br/>Bitte melde dich neu an, um<br/>die neuen Funktionen zu nutzen.`,
			timeout: 10000,
			fixed: true,
		});
	}
	if (Storage.check("VorgabenU") && Storage.get<IVorgabenU>("VorgabenU")?.vorgabenB[0].endeB.Nwoche === undefined)
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
		const benutzer = Storage.check("VorgabenU")
			? Storage.get<IVorgabenU>("VorgabenU")?.pers.Vorname
			: Storage.get<string>("Benutzer");
		if (!benutzer) throw new Error("Benutzer nicht gefunden");

		if (btnLogin) btnLogin.classList.add("d-none");

		if (willkommenEl) willkommenEl.innerHTML = `Hallo, ${benutzer}.`;
		if (loginDisplayEl) loginDisplayEl.classList.add("d-none");

		const jahr = Storage.get<number>("Jahr");
		const monat = Storage.get<number>("Monat");
		if (!jahr || !monat) throw new Error("Jahr oder Monat nicht erkannt");

		if (jahrEl) jahrEl.value = jahr.toString();
		if (monatEl) monatEl.value = monat.toString();

		console.log("Benutzer gefunden");

		const vorgabenU = Storage.get<IVorgabenU>("VorgabenU");
		if (vorgabenU && vorgabenU.pers.TB == "Tarifkraft" && nebenTabEl) nebenTabEl.classList.remove("d-none");

		if (Storage.check("accessToken")) {
			const berechtigung = decodeAccessToken().Berechtigung;
			if (adminEl && berechtigung & 2) adminEl.classList.remove("d-none");
		}

		monatEl?.classList.remove("d-none");
		navmenuEl?.classList.remove("d-none");
		btnNavmenuEl?.classList.remove("d-none");

		if (navigator.onLine) SelectYear(monat, jahr);
	}
});
