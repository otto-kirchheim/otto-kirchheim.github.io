import { createSnackBar } from "../class/CustomSnackbar";
import { IVorgabenU } from "../interfaces";
import { Storage, decodeAccessToken } from "../utilities";
import { Logout, loginUser, checkNeuerBenutzer, checkPasswort, SelectYear, changeMonatJahr } from "./utils";

window.addEventListener("load", () => {
	if (Storage.size() > 3 && Storage.check("UserID")) {
		const benutzer = Storage.get<string>("Benutzer");
		Logout();
		createSnackBar({
			message: `Hallo ${benutzer},<br/>die App hat ein Update erhalten.<br/>Bitte melde dich neu an, um<br/>die neuen Funktionen zu nutzen.`,
			status: "info",
			timeout: 10000,
			position: "br",
			fixed: true,
		});
	}
	if (Storage.check("VorgabenU") && Storage.get<IVorgabenU>("VorgabenU").vorgabenB[0].endeB.Nwoche === undefined)
		Storage.remove("VorgabenU");

	const formLogin = document.querySelector<HTMLFormElement>("#formLogin");
	formLogin?.addEventListener("submit", e => {
		e.preventDefault();
		loginUser();
	});

	const formNewUser = document.querySelector<HTMLFormElement>("#formNewUser");
	formNewUser?.addEventListener("submit", e => {
		e.preventDefault();
		checkNeuerBenutzer();
	});

	const formChangePW = document.querySelector<HTMLFormElement>("#formChangePW");
	formChangePW?.addEventListener("submit", e => {
		e.preventDefault();
		checkPasswort();
	});

	const formSelectMonatJahr = document.querySelector<HTMLFormElement>("#formSelectMonatJahr");
	formSelectMonatJahr?.addEventListener("submit", e => {
		e.preventDefault();
		SelectYear();
	});

	const btnNewUser = document.querySelector<HTMLButtonElement>("#btnNewUser");
	btnNewUser?.addEventListener("click", () => {
		const loginDisplay = document.querySelector<HTMLDivElement>("#loginDisplay");
		const newDisplay = document.querySelector<HTMLDivElement>("#NewDisplay");
		if (loginDisplay && newDisplay) {
			loginDisplay.classList.add("d-none");
			newDisplay.classList.remove("d-none");
		}
	});

	const btnCancelNewUser = document.querySelector<HTMLButtonElement>("#btnCancelNewUser");
	btnCancelNewUser?.addEventListener("click", () => {
		const newDisplay = document.querySelector<HTMLDivElement>("#NewDisplay");
		const loginDisplay = document.querySelector<HTMLDivElement>("#loginDisplay");
		if (newDisplay && loginDisplay) {
			newDisplay.classList.add("d-none");
			loginDisplay.classList.remove("d-none");
		}
	});

	const btnCancelChangePW = document.querySelector<HTMLButtonElement>("#btnCancelChangePW");
	btnCancelChangePW?.addEventListener("click", () => {
		const changeDisplay = document.querySelector<HTMLDivElement>("#ChangeDisplay");
		const selectDisplay = document.querySelector<HTMLDivElement>("#SelectDisplay");
		if (changeDisplay && selectDisplay) {
			changeDisplay.classList.add("d-none");
			selectDisplay.classList.remove("d-none");
		}
	});

	const btnPasswortAEndern = document.querySelector<HTMLButtonElement>("#btnPasswortAEndern");
	btnPasswortAEndern?.addEventListener("click", () => {
		const selectDisplay = document.querySelector<HTMLDivElement>("#SelectDisplay");
		const changeDisplay = document.querySelector<HTMLDivElement>("#ChangeDisplay");
		if (selectDisplay && changeDisplay) {
			selectDisplay.classList.add("d-none");
			changeDisplay.classList.remove("d-none");
		}
	});

	const btnLogout = document.querySelector<HTMLButtonElement>("#btnLogout");
	btnLogout?.addEventListener("click", Logout);

	const Monat = document.querySelector<HTMLInputElement>("#Monat");
	Monat?.addEventListener("change", changeMonatJahr);

	const Jahr = document.querySelector<HTMLInputElement>("#Jahr");
	Jahr?.addEventListener("change", changeMonatJahr);

	const willkommenEl = document.querySelector<HTMLHeadingElement>("#Willkommen");
	const jahrEl = document.querySelector<HTMLInputElement>("#Jahr");
	const monatEl = document.querySelector<HTMLInputElement>("#Monat");
	const loginDisplayEl = document.querySelector<HTMLDivElement>("#loginDisplay");
	const selectDisplayEl = document.querySelector<HTMLDivElement>("#SelectDisplay");

	const nebenTab = document.querySelector<HTMLButtonElement>("#neben-tab");
	if (!nebenTab) throw new Error("Element nicht gefunden");
	const nebenTabEl = nebenTab.parentElement as HTMLLIElement;

	const adminEl = document.querySelector<HTMLDivElement>("#admin");
	const navmenuEl = document.querySelector<HTMLDivElement>("#navmenu");
	const btnNavmenuEl = document.querySelector<HTMLButtonElement>("#btn-navmenu");

	if (Storage.check("Benutzer") && Storage.check("accessToken")) {
		const benutzer = Storage.check("VorgabenU")
			? Storage.get<IVorgabenU>("VorgabenU").pers.Vorname
			: Storage.get<string>("Benutzer");
		if (willkommenEl) willkommenEl.innerHTML = `Hallo, ${benutzer}.`;
		if (loginDisplayEl) loginDisplayEl.classList.add("d-none");

		const jahr = Storage.get<number>("Jahr");
		if (jahrEl) jahrEl.value = jahr.toString();

		const monat = Storage.get<number>("Monat");
		if (monatEl) monatEl.value = monat.toString();

		selectDisplayEl?.classList.remove("d-none");
		console.log("Benutzer gefunden");

		const vorgabenU = Storage.get<IVorgabenU>("VorgabenU");
		if (vorgabenU && vorgabenU.pers.TB == "Tarifkraft" && nebenTabEl) {
			nebenTabEl.classList.remove("d-none");
		}

		if (Storage.check("accessToken")) {
			const berechtigung = decodeAccessToken().Berechtigung;
			if (adminEl && berechtigung & 2) {
				adminEl.classList.remove("d-none");
			}
		}

		navmenuEl?.classList.remove("d-none");
		btnNavmenuEl?.classList.remove("d-none");

		if (navigator.onLine) SelectYear(monat, jahr);
	}
});
