// import "preact/debug";

import Popover from "bootstrap/js/dist/popover";
import Tab from "bootstrap/js/dist/tab";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import Dropdown from "bootstrap/js/dist/dropdown";
import Collapse from "bootstrap/js/dist/collapse";
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

	Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dropdownToggleEl => new Dropdown(dropdownToggleEl));
	Array.from(document.querySelectorAll(".offcanvas")).forEach(offcanvasEl => new Offcanvas(offcanvasEl));
	Array.from(document.querySelectorAll(".collapse")).forEach(collapseEl => new Collapse(collapseEl, { toggle: false }));
	Array.from(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(
		popoverTriggerEl => new Popover(popoverTriggerEl),
	);
});

import "./Login";
import "./Einstellungen";
import "./Bereitschaft";
import "./EWT";
import "./Neben";
import "./Berechnung";

import "../scss/styles.scss";
