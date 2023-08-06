import Tab from "bootstrap/js/dist/tab";
import { Storage } from "../../utilities";
import { controller, newAbortControler } from "../../utilities/FetchRetry";

function toggleClassForElement(selector: string, className: string, addClass: boolean): void {
	const element = document.querySelector<HTMLElement>(selector);
	addClass ? element?.classList.add(className) : element?.classList.remove(className);
}

export default function Logout(): void {
	controller.abort();
	newAbortControler();
	Storage.clear();

	const sel = document.querySelector<HTMLButtonElement>(`#start-tab`);
	if (sel instanceof HTMLButtonElement) {
		Tab.getOrCreateInstance(sel).show();
		window.scrollTo(0, 1);
	}

	for (const selector of ["#navmenu", "#btn-navmenu", "#admin", "#Neben-tab", "#Monat"])
		toggleClassForElement(selector, "d-none", true);

	toggleClassForElement("#btnLogin", "d-none", false);

	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) willkommen.innerHTML = "Willkommen";
}
