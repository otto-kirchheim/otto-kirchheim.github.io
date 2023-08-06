import Modal from "bootstrap/js/dist/modal";
import { createSnackBar } from "../../class/CustomSnackbar";
import { CustomHTMLDivElement } from "../../interfaces";
import { clearLoading, setLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";

export default async function checkPasswort(modal: CustomHTMLDivElement): Promise<void> {
	const errorMessage = modal.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) throw new Error("Fehler: errorMessage nicht gefunden!");

	const passwortAltInput = modal.querySelector<HTMLInputElement>("#PasswortAlt");
	if (!passwortAltInput) throw new Error("Fehler: PasswortAlt InputElement nicht gefunden!");
	const PasswortAlt = passwortAltInput.value.trim();

	const passwortNewInput = modal.querySelector<HTMLInputElement>("#PasswortNeu");
	if (!passwortNewInput) throw new Error("Fehler: PasswortNeu InputElement nicht gefunden!");
	const PasswortNeu = passwortNewInput.value.trim();

	const passwortNew2Input = modal.querySelector<HTMLInputElement>("#PasswortNeu2");
	if (!passwortNew2Input) throw new Error("Fehler: PasswortNeu2 InputElement nicht gefunden!");
	const PasswortNeu2 = passwortNew2Input.value.trim();

	if (!PasswortAlt) {
		errorMessage.textContent = "Bitte Aktuelles Passwort Eingeben";
		return;
	}
	if (!PasswortNeu) {
		errorMessage.textContent = "Bitte Neues Passwort Eingeben";
		return;
	}
	if (!PasswortNeu2) {
		errorMessage.textContent = "Bitte Neues Passwort wiederholen";
		return;
	}
	if (PasswortNeu != PasswortNeu2) {
		errorMessage.textContent = "Passwort falsch wiederholt";
		return;
	}
	if (PasswortAlt == PasswortNeu) {
		errorMessage.textContent = "Passwörter Alt und Neu sind gleich";
		return;
	}

	setLoading("btnChange");

	try {
		const data = { PasswortAlt, PasswortNeu };

		const fetched = await FetchRetry<
			{
				PasswortAlt: string;
				PasswortNeu: string;
			},
			true | Error
		>("changePW", data, "POST");
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode !== 200) {
			console.log(fetched.message ?? "Fehler");
			errorMessage.innerHTML = fetched.message;
			createSnackBar({
				message: `Passwort konnte nicht geändert werden.`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		} else {
			Modal.getInstance(modal)?.hide();

			console.log(`Passwort geändert: ${fetched.data}`);
			createSnackBar({
				message: fetched.data ? `Passwort wurde geändert.` : `Passwort wurde nicht geändert.`,
				status: "success",
				timeout: 3000,
				fixed: true,
			});
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnChange");
	}
}
