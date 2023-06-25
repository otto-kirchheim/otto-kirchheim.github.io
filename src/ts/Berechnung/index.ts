import { IVorgabenBerechnung, IVorgabenGeld } from "../interfaces";
import { Storage } from "../utilities";
import generateTableBerechnung from "./generateTableBerechnung";

export { generateTableBerechnung };

window.addEventListener("load", () => {
	if (Storage.check("VorgabenU") && Storage.check("datenBerechnung") && Storage.check("VorgabenGeld"))
		generateTableBerechnung(
			Storage.get<IVorgabenBerechnung>("datenBerechnung"),
			Storage.get<IVorgabenGeld>("VorgabenGeld")
		);
});
