import { Storage, saveDaten } from "../utilities";
import { generateEingabeMaskeEinstellungen, generateEingabeTabelleEinstellungenVorgabenB } from "./utils";

window.addEventListener("load", () => {
	const form = document.querySelector<HTMLFormElement>("#formEinstellungen");
	const saveButton = document.querySelector<HTMLButtonElement>("#btnSaveEinstellungen");

	if (form && saveButton) {
		form.addEventListener("submit", event => {
			event.stopPropagation();
			event.preventDefault();
			saveDaten(saveButton);
		});
	}

	Storage.check("VorgabenU") ? generateEingabeMaskeEinstellungen() : generateEingabeTabelleEinstellungenVorgabenB({});
});
