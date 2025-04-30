import { Storage, abortController, getValidAccesstoken, tokenErneuern } from ".";
import { createSnackBar } from "../class/CustomSnackbar";

interface ServerConfig {
	url: string;
	timeout: number;
}
/**
 * Checks the server connection with a configurable timeout.
 * @param serverUrl - The URL of the server to check.
 * @param timeout - The timeout duration in milliseconds.
 * @returns A promise that resolves to a boolean indicating the server's availability.
 */
async function checkServerConnection(serverUrl: string, timeout: number): Promise<boolean> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.log(`Server check for ${serverUrl} timed out after ${timeout}ms.`);
		controller.abort("Timeout");
	}, timeout);

	try {
		console.time("Serververbindung herstellen");
		await fetch(`${serverUrl}/`, { method: "GET", signal: controller.signal });
		sessionStorage.setItem("lastServerContact", Date.now().toString());
		return true;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError")
			console.error(`Fetch aborted for ${serverUrl}:`, error.message);
		return false;
	} finally {
		clearTimeout(timeoutId);
		console.timeEnd("Serververbindung herstellen");
	}
}

export async function getServerUrl(): Promise<string> {
	const lastServerContact = sessionStorage.getItem("lastServerContact");
	const serverConfigs: ServerConfig[] = API_URL.map(config => ({
		...config,
		timeout: config.timeout || 5000, // Default timeout if not provided
	}));
	const currentServerUrl = sessionStorage.getItem("currentServerUrl");
	const defaultServerUrl = serverConfigs[0].url;

	if (!lastServerContact || +lastServerContact - Date.now() + 5 * 60 * 1000 < 0) {
		const statusSnackBar = createSnackBar({
			message: "Serververbindung wird aufgebaut. Bitte warten.",
			dismissible: false,
			status: "info",
			timeout: false,
			fixed: true,
		});
		for (const config of serverConfigs) {
			if (await checkServerConnection(config.url, config.timeout)) {
				sessionStorage.setItem("currentServerUrl", config.url);
				statusSnackBar.Close();
				return config.url;
			}
		}
		statusSnackBar.Close();
		createSnackBar({
			message: "Server nicht Erreichbar",
			dismissible: true,
			icon: "warning",
			status: "warning",
			timeout: 3000,
			fixed: true,
		});
		throw new Error("Server nicht Erreichbar");
	} else {
		return currentServerUrl ?? defaultServerUrl;
	}
}

export async function FetchRetry<I, T>(
	UrlPath: string,
	data?: I,
	method: "GET" | "POST" | "UPDATE" = "GET",
	retry = 0,
	accessToken?: string,
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
	} catch (error: unknown) {
		console.error("Fetch error occurred:", error);
		throw new Error(
			`Fetch-Fehler: ${(<Error>error).message || error}. URL: ${serverUrl}/${UrlPath}, Method: ${method}, Retry: ${retry}`,
		);
	}
}

export const API_URL: ServerConfig[] = import.meta.env.PROD
	? [
			{ url: "https://lst.otto.home64.de/api/v1", timeout: 5000 },
			{ url: "https://web-app-rn6h2lgzma-ey.a.run.app/api/v1", timeout: 20000 },
		]
	: [
			{ url: "http://192.168.178.56:8081/api/v1", timeout: 3000 },
			{ url: "http://localhost:8081/api/v1", timeout: 2000 },
		];
