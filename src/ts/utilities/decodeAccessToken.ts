import { Storage } from ".";

type decodedAccessToken = {
	id: string;
	Name: string;
	Berechtigung: number;
	iat: number;
	exp: number;
};

export default function decodeAccessToken(accesstoken = Storage.get<string>("accessToken")): decodedAccessToken {
	const base64Url = accesstoken.split(".")[1];
	const base64 = convertUrlBase64ToBase64(base64Url);
	const jsonPayload = decodeBase64ToJSON(base64);
	return JSON.parse(jsonPayload);

	function convertUrlBase64ToBase64(base64Url: string): string {
		return base64Url.replace(/-/g, "+").replace(/_/g, "/");
	}

	function decodeBase64ToJSON(base64: string): string {
		return decodeURIComponent(
			window
				.atob(base64)
				.split("")
				.map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join("")
		);
	}
}
