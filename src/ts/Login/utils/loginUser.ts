import { SelectYear } from ".";
import { Storage, clearLoading, decodeAccessToken, setLoading } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import dayjs from "../../utilities/configDayjs";

export default async function loginUser(username?: string, passwort?: string): Promise<void> {
	const usernameInput = document.querySelector<HTMLInputElement>("#Benutzer");
	if (!usernameInput) throw new Error("Benutzer Input nicht gefunden");
	if (!username) {
		username = usernameInput.value;
	}
	const passwortInput = document.querySelector<HTMLInputElement>("#Passwort");
	if (!passwortInput) throw new Error("Passwort Input nicht gefunden");
	if (!passwort) {
		passwort = passwortInput.value;
	}
	const btnLogin = document.querySelector<HTMLButtonElement>("#btnLogin");
	if (btnLogin) {
		btnLogin.disabled = true;
	}
	setLoading("btnLogin");

	const errorMessage = document.querySelector<HTMLDivElement>("#errorMessage");
	if (!errorMessage) throw new Error("Error Nachrichtenfeld nicht gefunden");

	const data = { Name: username, Passwort: passwort };

	try {
		const fetched = await FetchRetry<{ Name: string; Passwort: string }, { accessToken: string; refreshToken: string }>(
			"login",
			data,
			"POST"
		);
		if (fetched instanceof Error) throw fetched;
		if (fetched.statusCode == 200) {
			const { accessToken, refreshToken } = fetched.data;
			console.log({ accessToken, refreshToken });
			username = `${username[0].toUpperCase()}${username.substring(1)}`;
			Storage.set("Benutzer", username);
			const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
			if (willkommen) {
				willkommen.innerHTML = `Hallo, ${username}.`;
			}
			document.querySelector<HTMLDivElement>("#loginDisplay")?.classList.add("d-none");
			document.querySelector<HTMLDivElement>("#ChangeDisplay")?.classList.add("d-none");
			document.querySelector<HTMLDivElement>("#NewDisplay")?.classList.add("d-none");

			Storage.set("accessToken", accessToken);
			Storage.set("refreshToken", refreshToken);

			const aktJahr = dayjs().year();
			const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
			if (jahrInput) {
				jahrInput.value = aktJahr.toString();
			}

			const monat = dayjs().month() + 1;
			const monatInput = document.querySelector<HTMLInputElement>("#Monat");
			if (monatInput) {
				monatInput.value = monat.toString();
			}

			document.querySelector<HTMLDivElement>("#SelectDisplay")?.classList.remove("d-none");
			usernameInput.value = "";
			passwortInput.value = "";

			errorMessage.innerHTML = "";

			if (Storage.check("accessToken")) {
				if (decodeAccessToken().Berechtigung & 2)
					document.querySelector<HTMLDivElement>("#admin")?.classList.remove("d-none");
			}

			console.log("Eingeloggt");
			SelectYear(monat, aktJahr);
		} else {
			errorMessage.innerHTML = fetched.message;
		}
	} catch (err) {
		err instanceof Error ? console.log(err.message) : console.log(err);
	} finally {
		clearLoading("btnLogin");
	}
}
