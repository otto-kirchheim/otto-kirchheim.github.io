import { SelectYear } from ".";
import { Storage, decodeAccessToken } from "../../utilities";
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
	console.log({ accessToken, refreshToken });
	username = `${username[0].toUpperCase()}${username.substring(1)}`;
	Storage.set("Benutzer", username);
	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) willkommen.innerHTML = `Hallo, ${username}.`;

	document.querySelector<HTMLDivElement>("#loginDisplay")?.classList.add("d-none");
	document.querySelector<HTMLDivElement>("#ChangeDisplay")?.classList.add("d-none");
	document.querySelector<HTMLDivElement>("#NewDisplay")?.classList.add("d-none");

	Storage.set("accessToken", accessToken);
	Storage.set("refreshToken", refreshToken);

	const aktJahr = dayjs().year();
	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	if (jahrInput) jahrInput.value = aktJahr.toString();

	const monat = dayjs().month() + 1;
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	if (monatInput) monatInput.value = monat.toString();

	document.querySelector<HTMLDivElement>("#SelectDisplay")?.classList.remove("d-none");

	if (Storage.check("accessToken"))
		if (decodeAccessToken().Berechtigung & 2)
			document.querySelector<HTMLDivElement>("#admin")?.classList.remove("d-none");

	console.log("Eingeloggt");
	SelectYear(monat, aktJahr);
}
