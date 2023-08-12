import { createSnackBar } from "../class/CustomSnackbar";
import { FetchRetry } from ".";
import { Storage } from "../utilities";
import { Logout } from "../Einstellungen/utils";

let REFRESHED = 0;

export default async function tokenErneuern(
	retry?: number,
	refreshToken: string = Storage.get("refreshToken", { check: true }),
	accessToken: string = Storage.get("accessToken", { check: true }),
): Promise<string> {
	if (isTokenRefreshLimitReached(refreshToken, accessToken)) {
		resetRefreshCounter();
		showErrorAndLogout();
		throw new Error("Fehler bei Token erneuerung, refreshlimit erreicht");
	}

	const responded = await FetchRetry<{ refreshToken: string }, { accessToken: string; refreshToken: string }>(
		"refreshToken",
		{ refreshToken },
		"POST",
		retry,
		accessToken,
	);
	if (responded instanceof Error) throw responded;
	if (responded.statusCode === 200) {
		incrementRefreshCounter();
		const { accessToken, refreshToken } = responded.data;
		console.log({ accessToken, refreshToken });
		Storage.set("accessToken", accessToken);
		Storage.set("refreshToken", refreshToken);
		return accessToken;
	} else {
		showErrorAndLogout();
		console.error(responded.message);
		throw new Error("Fehler bei Token erneuerung");
	}
}

function isTokenRefreshLimitReached(refreshToken: string, accessToken: string): boolean {
	return !refreshToken || !accessToken || REFRESHED > 2;
}

function resetRefreshCounter(): void {
	REFRESHED = 0;
}

function incrementRefreshCounter(): void {
	REFRESHED++;
}

function showErrorAndLogout(): void {
	Logout();
	createSnackBar({
		message: `Login<br/>Fehlerhafte Anmeldung,</br> bitte Erneut anmelden!`,
		status: "error",
		timeout: 3000,
		fixed: true,
	});
}
