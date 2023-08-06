import { Storage, saveDaten } from "../utilities";
import { createModalChangePassword } from "./components";
import {
	Logout,
	SelectYear,
	changeMonatJahr,
	generateEingabeMaskeEinstellungen,
	generateEingabeTabelleEinstellungenVorgabenB,
} from "./utils";

window.addEventListener("load", () => {
	const Monat = document.querySelector<HTMLInputElement>("#Monat");
	Monat?.addEventListener("change", changeMonatJahr);

	const Jahr = document.querySelector<HTMLInputElement>("#Jahr");
	Jahr?.addEventListener("change", changeMonatJahr);

	const formSelectMonatJahr = document.querySelector<HTMLFormElement>("#formSelectMonatJahr");
	formSelectMonatJahr?.addEventListener("submit", e => {
		e.preventDefault();
		SelectYear();
	});

	const btnPasswortAEndern = document.querySelector<HTMLButtonElement>("#btnPasswortAEndern");
	btnPasswortAEndern?.addEventListener("click", createModalChangePassword);

	const btnLogout = document.querySelector<HTMLButtonElement>("#btnLogout");
	btnLogout?.addEventListener("click", Logout);

	const form = document.querySelector<HTMLFormElement>("#formEinstellungen");
	const saveButton = document.querySelector<HTMLButtonElement>("#btnSaveEinstellungen");

	if (form && saveButton)
		form.addEventListener("submit", event => {
			event.stopPropagation();
			event.preventDefault();
			saveDaten(saveButton);
		});

	Storage.check("VorgabenU") ? generateEingabeMaskeEinstellungen() : generateEingabeTabelleEinstellungenVorgabenB({});
});
