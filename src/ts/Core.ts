import { Popover, Tab } from "bootstrap";
import { createSnackBar } from "./class/CustomSnackbar";
import { Storage, initializeColorModeToggler, setOffline, storageAvailable } from "./utilities";

window.addEventListener("load", () => {
	if (!storageAvailable("localStorage")) {
		createSnackBar({
			message: "Bitte Cookies zulassen!",
			dismissible: true,
			status: "error",
			timeout: false,
			position: "tc",
			fixed: false,
		});
	}
	initializeColorModeToggler();

	if (!navigator.onLine) setOffline();
	else window.addEventListener("offline", setOffline);

	if (Storage.check("accessToken")) {
		const url = document.location.toString();
		const regex = /#/i;
		if (regex.exec(url)) {
			const tab = url.split("#")[1];
			console.log(tab);
			const sel = document.querySelector<HTMLButtonElement>(`#${tab.toLowerCase()}-tab`);
			if (sel instanceof HTMLButtonElement) {
				console.log(sel);
				Tab.getOrCreateInstance(sel).show();
				window.scrollTo(0, 1);
			}
		}
	}

	Array.from(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(
		popoverTriggerEl => new Popover(popoverTriggerEl)
	);
});
