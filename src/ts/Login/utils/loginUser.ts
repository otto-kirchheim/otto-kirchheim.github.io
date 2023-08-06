import Modal from "bootstrap/js/dist/modal";
import { userLoginSuccess } from ".";
import { clearLoading, setLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import { CustomHTMLDivElement } from "../../interfaces";

export default async function loginUser(
	modal: CustomHTMLDivElement,
	username?: string,
	passwort?: string,
): Promise<void> {
	const usernameInput = modal.querySelector<HTMLInputElement>("#Benutzer");
	if (!usernameInput) throw new Error("Benutzer Input nicht gefunden");
	if (!username) username = usernameInput.value;

	const passwortInput = modal.querySelector<HTMLInputElement>("#Passwort");
	if (!passwortInput) throw new Error("Passwort Input nicht gefunden");
	if (!passwort) passwort = passwortInput.value;

	const btnLogin = document.querySelector<HTMLButtonElement>("#btnLogin");
	if (btnLogin) btnLogin.disabled = true;
	setLoading("btnLogin");

	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) throw new Error("Error Nachrichtenfeld nicht gefunden");

	const data = { Name: username, Passwort: passwort };

	try {
		const fetched = await FetchRetry<{ Name: string; Passwort: string }, { accessToken: string; refreshToken: string }>(
			"login",
			data,
			"POST",
		);
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode === 200) {
			Modal.getInstance(modal)?.hide();

			userLoginSuccess({ ...fetched.data, username });
		} else errorMessage.innerHTML = fetched.message;
	} catch (err) {
		err instanceof Error ? console.log(err.message) : console.log(err);
	} finally {
		clearLoading("btnLogin", false);
	}
}
