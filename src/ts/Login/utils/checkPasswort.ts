import { createSnackBar } from "../../class/CustomSnackbar";
import { clearLoading, setLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";

export default async function checkPasswort(): Promise<void> {
	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) {
		throw new Error("Fehler: errorMessage nicht gefunden!");
	}
	const passwortAltInput = document.querySelector<HTMLInputElement>("#passwortOld");
	if (!passwortAltInput) {
		throw new Error("Fehler: passwortOld InputElement nicht gefunden!");
	}
	const passwortAlt = passwortAltInput.value.trim();

	const passwort3Input = document.querySelector<HTMLInputElement>("#Passwort3");
	if (!passwort3Input) {
		throw new Error("Fehler: Passwort3 InputElement nicht gefunden!");
	}
	const passwort3 = passwort3Input.value.trim();

	const passwort4Input = document.querySelector<HTMLInputElement>("#Passwort4");
	if (!passwort4Input) {
		throw new Error("Fehler: Passwort4 InputElement nicht gefunden!");
	}
	const passwort4 = passwort4Input.value.trim();

	if (!passwortAlt) {
		errorMessage.textContent = "Bitte Aktuelles Passwort Eingeben";
		return;
	}
	if (!passwort3) {
		errorMessage.textContent = "Bitte Neues Passwort Eingeben";
		return;
	}
	if (!passwort4) {
		errorMessage.textContent = "Bitte Neues Passwort wiederholen";
		return;
	}
	if (passwort3 != passwort4) {
		errorMessage.textContent = "Passworter falsch wiederholt";
		return;
	}
	if (passwortAlt == passwort3) {
		errorMessage.textContent = "Passwörter Alt und Neu sind gleich";
		return;
	}

	setLoading("btnChange");

	try {
		const data = {
			PasswortAlt: passwortAlt,
			PasswortNeu: passwort3,
		};

		const fetched = await FetchRetry<
			{
				PasswortAlt: string;
				PasswortNeu: string;
			},
			null
		>("changePW", data, "POST");
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode >= 400) {
			console.log(fetched.message);
			errorMessage.innerHTML = fetched.message;
			createSnackBar({
				message: `Login<br/>Passwort konnte nicht geändert werden.`,
				status: "error",
				timeout: 3000,
				position: "br",
				fixed: true,
			});
			return;
		} else if (fetched.statusCode == 200) {
			console.log(`Passwort geändert: ${fetched.data}`);
			createSnackBar({
				message: `Login<br/>Passwort wurde geändert.`,
				status: "success",
				timeout: 3000,
				position: "br",
				fixed: true,
			});
			errorMessage.innerHTML = "";
		} else {
			console.log("Fehler");
			createSnackBar({
				message: `Login<br/>Passwort konnte nicht geändert werden.`,
				status: "error",
				timeout: 3000,
				position: "br",
				fixed: true,
			});
			return;
		}
		const selectDisplay = document.querySelector<HTMLDivElement>("#SelectDisplay");
		if (!selectDisplay) {
			throw new Error("Fehler: SelectDisplay nicht gefunden!");
		}
		selectDisplay.classList.remove("d-none");

		const changeDisplay = document.querySelector<HTMLDivElement>("#ChangeDisplay");
		if (!changeDisplay) {
			throw new Error("Fehler: ChangeDisplay nicht gefunden!");
		}
		changeDisplay.classList.add("d-none");

		passwortAltInput.value = "";
		passwort3Input.value = "";
		passwort4Input.value = "";
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnChange");
	}
}
