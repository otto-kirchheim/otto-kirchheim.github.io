import { Storage, decodeAccessToken, tokenErneuern } from ".";

export default async function getValidAccesstoken(accessToken?: string, refreshToken?: string): Promise<string> {
	if (!accessToken) {
		accessToken = Storage.get<string>("accessToken", { check: true });
		if (!accessToken) throw new Error("accessToken fehlt");
	}

	const tokenPayload = decodeAccessToken(accessToken);
	const isTokenExpired = tokenPayload.exp * 1000 < Date.now();

	return isTokenExpired ? await tokenErneuern(0, refreshToken, accessToken) : accessToken;
}
