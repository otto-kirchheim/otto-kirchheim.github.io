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

	const selectorsToAddDNone = ["#navmenu", "#btn-navmenu", "#NewDisplay", "#SelectDisplay", "#admin", "#Neben-tab"];

	for (const selector of selectorsToAddDNone) toggleClassForElement(selector, "d-none", true);

	toggleClassForElement("#loginDisplay", "d-none", false);

	const willkommen = document.querySelector<HTMLHeadingElement>("#Willkommen");
	if (willkommen) willkommen.innerHTML = "Willkommen";
}
