import { Storage, decodeAccessToken, tokenErneuern } from ".";

export default async function getValidAccesstoken(accesstoken?: string): Promise<string> {
	if (!accesstoken) accesstoken = Storage.get<string>("accessToken", { check: true });
	if (!accesstoken) throw new Error("accessToken fehlt");
	const tokenPayload = decodeAccessToken(accesstoken);
	const expirationTimeInSeconds = getExpirationTimeInSeconds(tokenPayload.exp);
	const now = new Date();
	return isTokenExpired(expirationTimeInSeconds, now) ? await tokenErneuern() : accesstoken;

	function getExpirationTimeInSeconds(expirationTime: number): number {
		return expirationTime * 1000;
	}

	function isTokenExpired(expirationTimeInSeconds: number, now: Date): boolean {
		return expirationTimeInSeconds < now.getTime();
	}
}
