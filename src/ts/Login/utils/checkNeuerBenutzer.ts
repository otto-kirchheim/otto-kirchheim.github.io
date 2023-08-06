import Modal from "bootstrap/js/dist/modal";
import { createSnackBar } from "../../class/CustomSnackbar";
import { clearLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import userLoginSuccess from "./userLoginSuccess";
import { CustomHTMLDivElement } from "../../interfaces";

export default async function checkNeuerBenutzer(modal: CustomHTMLDivElement): Promise<void> {
	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) throw new Error("errorMessage not found");

	const zugangscode = document.querySelector<HTMLInputElement>("#Zugang");
	if (!zugangscode?.value.trim()) {
		errorMessage.textContent = "Bitte Zugangscode Eingeben";
		return;
	}
	const benutzer = document.querySelector<HTMLInputElement>("#Benutzer");
	if (!benutzer?.value.trim()) {
		errorMessage.textContent = "Bitte Benutzername Eingeben";
		return;
	}

	const passwort1 = document.querySelector<HTMLInputElement>("#Passwort");
	if (!passwort1?.value.trim()) {
		errorMessage.textContent = "Bitte Passwort Eingeben";
		return;
	}
	const passwort2 = document.querySelector<HTMLInputElement>("#Passwort2");
	if (!passwort2?.value.trim()) {
		errorMessage.textContent = "Bitte Passwort wiederholen";
		return;
	}
	if (passwort1.value !== passwort2.value) {
		errorMessage.textContent = "Passwörter falsch wiederholt";
		return;
	}

	const data = {
		Code: zugangscode.value.trim(),
		Name: benutzer.value.trim(),
		Passwort: passwort1.value.trim(),
	};
	try {
		const fetched = await FetchRetry<
			{
				Code: string;
				Name: string;
				Passwort: string;
			},
			{ accessToken: string; refreshToken: string }
		>("add", data, "POST");
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode !== 201) {
			console.log(fetched.message);
			errorMessage.innerHTML = fetched.message;
			createSnackBar({
				message: `Fehler bei Benutzerstellung: </br>${fetched.message}`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		} else {
			Modal.getInstance(modal)?.hide();

			createSnackBar({
				message: `Benutzer erfolgreich angelegt.`,
				status: "success",
				timeout: 3000,
				fixed: true,
			});

			userLoginSuccess({ ...fetched.data, username: data.Name });
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnNeu");
	}
}
