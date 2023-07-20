import { createSnackBar } from "../class/CustomSnackbar";
import { Storage } from "../utilities";
import tokenErneuern from "./tokenErneuern";
import getValidAccesstoken from "./getValidAccesstoken";

export let controller: AbortController;
let signal: AbortSignal;
newAbortControler();

export function newAbortControler() {
	controller = new AbortController();
	signal = controller.signal;
}

export async function FetchRetry<I, T>(
	UrlPath: string,
	data?: I,
	method: "GET" | "POST" | "UPDATE" = "GET",
	retry = 0,
	accessToken?: string,
): Promise<{ data: T; status: boolean; statusCode: number; message: string } | Error> {
	if (!accessToken && Storage.check("accessToken")) accessToken = Storage.get<string>("accessToken");
	if (retry > 2) throw new Error("Zu viele Tokenfehler");
	const lastServerContact = +(sessionStorage.getItem("lastServerContact") as string);
	let serverReady = false;
	if (!lastServerContact || lastServerContact - Date.now() + 5 * 60 * 1000 < 0) {
		const statusSnackBar = createSnackBar({
			message: "Serververbindung wird aufgebaut. Bitte warten.",
			dismissible: false,
			status: "info",
			timeout: false,

			fixed: true,
		});

		try {
			console.time("Serververbindung herstellen");
			await fetch(`${API_URL}/`, { method: "GET", signal });
			sessionStorage.setItem("lastServerContact", Date.now().toString());
			serverReady = true;
		} catch {
			createSnackBar({
				message: "Server nicht Erreichbar",
				status: "error",
				fixed: true,
			});
			throw new Error("Server nicht Erreichbar");
		} finally {
			console.timeEnd("Serververbindung herstellen");
			statusSnackBar.Close();
		}
	} else {
		serverReady = true;
	}
	if (!serverReady) throw new Error("Server nicht Erreichbar");
	const headers = new Headers();
	if (method !== "GET") headers.set("Content-Type", "application/json");
	if (accessToken) {
		if (!data || (data && !Object.prototype.hasOwnProperty.call(data, "refreshToken")))
			accessToken = await getValidAccesstoken(accessToken);
		headers.set("Authorization", `Bearer ${accessToken}`);
	}
	const fetchObject: RequestInit = {
		mode: "cors",
		headers,
		method,
		signal,
		cache: "no-cache",
	};
	if (data) fetchObject.body = JSON.stringify(data);

	const response = await fetch(`${API_URL}/${UrlPath}`, fetchObject);
	const responded = await response.json();
	if (response.status == 401 && responded.message == "Token abgelaufen") {
		if (!accessToken) throw new Error("Fehler bei Token aktualisieren");
		accessToken = await tokenErneuern(retry, undefined, accessToken);
		return await FetchRetry(UrlPath, data, method, retry + 1, accessToken);
	}
	responded.statusCode = response.status;
	return responded;
}

export const API_URL = import.meta.env.PROD
	? "https://web-app-rn6h2lgzma-ey.a.run.app/api/v1"
	: "http://192.168.178.56:8080/api/v1";
