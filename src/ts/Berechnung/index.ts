import { IVorgabenBerechnung, IVorgabenGeld } from "../interfaces";
import { Storage } from "../utilities";
import aktualisiereBerechnung from "./aktualisiereBerechnung";
import generateTableBerechnung from "./generateTableBerechnung";

export { generateTableBerechnung, aktualisiereBerechnung };

window.addEventListener("load", () => {
	if (Storage.check("VorgabenU") && Storage.check("datenBerechnung") && Storage.check("VorgabenGeld"))
		generateTableBerechnung(
			Storage.get<IVorgabenBerechnung>("datenBerechnung", { check: true }),
			Storage.get<IVorgabenGeld>("VorgabenGeld", { check: true }),
		);
});
