import Collapse from "bootstrap/js/dist/collapse";
import Dropdown from "bootstrap/js/dist/dropdown";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import Popover from "bootstrap/js/dist/popover";
import Tab from "bootstrap/js/dist/tab";
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
		const hash: string = document.location.hash;

		if (hash.length === 0) return;
		const selector: string = `${hash.toLowerCase()}-tab`;
		const tabElement = document.querySelector<HTMLButtonElement>(selector);

		if (!(tabElement instanceof HTMLButtonElement)) return;
		Tab.getOrCreateInstance(tabElement).show();
		window.scrollTo(0, 1);
	}

	Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dropdownToggleEl => new Dropdown(dropdownToggleEl));
	Array.from(document.querySelectorAll(".offcanvas")).forEach(offcanvasEl => new Offcanvas(offcanvasEl));
	Array.from(document.querySelectorAll(".collapse")).forEach(collapseEl => new Collapse(collapseEl, { toggle: false }));
	Array.from(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(
		popoverTriggerEl => new Popover(popoverTriggerEl),
	);
});

import "./Berechnung";
import "./Bereitschaft";
import "./EWT";
import "./Einstellungen";
import "./Login";
import "./Neben";

import "../scss/styles.scss";
