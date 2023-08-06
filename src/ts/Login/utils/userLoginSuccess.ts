import { SelectYear } from "../../Einstellungen/utils";
import { Storage, decodeAccessToken, setLoading } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function userLoginSuccess({
	accessToken,
	refreshToken,
	username,
}: {
	accessToken: string;
	refreshToken: string;
	username: string;
}): void {
	setLoading("btnLogin");
	console.log({ accessToken, refreshToken });
	username = `${username[0].toUpperCase()}${username.substring(1)}`;
	Storage.set("Benutzer", username);
	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) willkommen.innerHTML = `Hallo, ${username}.`;

	document.querySelector<HTMLButtonElement>("#btnLogin")?.classList.add("d-none");

	Storage.set("accessToken", accessToken);
	Storage.set("refreshToken", refreshToken);

	const aktJahr = dayjs().year();
	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	if (jahrInput) jahrInput.value = aktJahr.toString();

	const monat = dayjs().month() + 1;
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	if (monatInput) monatInput.value = monat.toString();

	if (Storage.check("accessToken"))
		if (decodeAccessToken().Berechtigung & 2)
			document.querySelector<HTMLDivElement>("#admin")?.classList.remove("d-none");

	const monatEl = document.querySelector<HTMLInputElement>("#Monat");
	monatEl?.classList.remove("d-none");

	console.log("Eingeloggt");
	SelectYear(monat, aktJahr);
}
