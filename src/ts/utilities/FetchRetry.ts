import { Storage, abortController, getValidAccesstoken, tokenErneuern } from ".";
import { createSnackBar } from "../class/CustomSnackbar";

async function checkServerConnection(serverUrl: string): Promise<boolean> {
	try {
		console.time("Serververbindung herstellen");
		await fetch(`${serverUrl}/`, { method: "GET", signal: abortController.signal });
		sessionStorage.setItem("lastServerContact", Date.now().toString());
		return true;
	} catch {
		return false;
	} finally {
		console.timeEnd("Serververbindung herstellen");
	}
}

export async function getServerUrl(): Promise<string> {
	const lastServerContact = sessionStorage.getItem("lastServerContact");
	const serverUrls = API_URL;
	let currentServerUrl = sessionStorage.getItem("currentServerUrl");

	if (!lastServerContact || +lastServerContact - Date.now() + 5 * 60 * 1000 < 0) {
		const statusSnackBar = createSnackBar({
			message: "Serververbindung wird aufgebaut. Bitte warten.",
			dismissible: false,
			status: "info",
			timeout: false,
			fixed: true,
		});
		for (const serverUrl of serverUrls) {
			if (await checkServerConnection(serverUrl)) {
				sessionStorage.setItem("currentServerUrl", serverUrl);
				statusSnackBar.Close();
				return serverUrl;
			}
		}
		statusSnackBar.Close();
		throw new Error("Server nicht Erreichbar");
	} else {
		return currentServerUrl ?? serverUrls[0];
	}
}

export async function FetchRetry<I, T>(
	UrlPath: string,
	data?: I,
	method: "GET" | "POST" | "UPDATE" = "GET",
	retry = 0,
	accessToken?: string
): Promise<{ data: T; status: boolean; statusCode: number; message: string } | Error> {
	if (!accessToken && Storage.check("accessToken")) accessToken = Storage.get<string>("accessToken", { check: true });
	if (retry > 2) throw new Error("Zu viele Tokenfehler");

	const serverUrl = await getServerUrl();

	const headers = new Headers();
	if (method !== "GET") headers.set("Content-Type", "application/json");
	if (accessToken) {
		if (!data || (data && !Object.hasOwn(data, "refreshToken"))) accessToken = await getValidAccesstoken(accessToken);
		headers.set("Authorization", `Bearer ${accessToken}`);
	}
	const fetchObject: RequestInit = {
		mode: "cors",
		headers,
		method,
		signal: abortController.signal,
		cache: "no-cache",
	};
	if (data) fetchObject.body = JSON.stringify(data);
	try {
		const response = await fetch(`${serverUrl}/${UrlPath}`, fetchObject);
		const responded = await response.json();
		if (response.status == 401 && responded.message == "Token abgelaufen") {
			if (!accessToken) throw new Error("Fehler bei Token aktualisieren");
			accessToken = await tokenErneuern(retry, undefined, accessToken);
			return await FetchRetry(UrlPath, data, method, retry + 1, accessToken);
		}
		responded.statusCode = response.status;
		return responded;
	} catch (error: any) {
		throw new Error("Fetch-Fehler: " + (error.message || error));
	}
}

export const API_URL = import.meta.env.PROD
	? [
			"https://lst-kirchheim.dnshome.de/api/v1",
			"https://otto1989.dnshome.de/api/v1",
			"https://web-app-rn6h2lgzma-ey.a.run.app/api/v1",
	  ]
	: ["http://192.168.178.56:8081/api/v1", "http://192.168.178.56:8081/api/v1"];
