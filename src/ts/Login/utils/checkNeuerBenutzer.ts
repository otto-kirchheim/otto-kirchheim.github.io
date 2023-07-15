import { createSnackBar } from "../../class/CustomSnackbar";
import { clearLoading, setLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import loginUser from "./loginUser";

export default async function checkNeuerBenutzer(): Promise<void> {
	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) {
		throw new Error("errorMessage not found");
	}
	const zugangscode = document.querySelector<HTMLInputElement>("#Zugang");
	if (!zugangscode?.value.trim()) {
		errorMessage.textContent = "Bitte Zugangscode Eingeben";
		return;
	}
	const benutzer = document.querySelector<HTMLInputElement>("#Benutzer2");
	if (!benutzer?.value.trim()) {
		errorMessage.textContent = "Bitte Benutzername Eingeben";
		return;
	}
	const passwort1 = document.querySelector<HTMLInputElement>("#Passwort1");
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
	setLoading("btnNeu");
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
			null
		>("add", data, "POST");
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode >= 400) {
			console.log(fetched.message);
			errorMessage.innerHTML = fetched.message;
			return;
		}
		if (fetched.statusCode == 201) {
			createSnackBar({
				message: `Registrierung<br/>Benutzer erfolgreich angelegt.`,
				status: "success",
				timeout: 3000,
				fixed: true,
			});
		} else {
			console.log("Fehler: ", fetched.message);
			createSnackBar({
				message: `Registrierung <br/>Fehler bei Benutzerstellung: </br>${fetched.message}`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			return;
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnNeu");
	}

	errorMessage.innerHTML = "";

	await loginUser(benutzer.value, passwort1.value);

	zugangscode.value = "";
	benutzer.value = "";
	passwort1.value = "";
	passwort2.value = "";
}
