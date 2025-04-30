import { createSnackBar } from "../../class/CustomSnackbar";
import type { IMonatsDaten } from "../../interfaces";
import { Storage, tableToArray } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function naechsterTag(
	tag?: string | number | null,
	dataE: IMonatsDaten["EWT"] = tableToArray("tableE"),
): void {
	const eingabefeldTagE = document.querySelector<HTMLInputElement>("#tagE");
	if (!eingabefeldTagE) throw new Error("Eingabefeld für Tag nicht gefunden");

	const vorhandeTage = new Set(dataE.map(tag => +tag.tagE)),
		letzterTag = dayjs(eingabefeldTagE.max).date();
	let loop = false;
	tag ??= dayjs(eingabefeldTagE.value).date();
	if (tag == "") tag = Math.max(...vorhandeTage.values()) | 0;
	if (typeof tag === "string") tag = +tag;

	vorhandeTage.delete(0);

	do {
		tag++;
		if (tag > letzterTag && !loop) {
			tag = 1;
			loop = true;
		} else if (tag > letzterTag && loop) {
			document
				.querySelector<HTMLButtonElement>("#modal > div > form > div.modal-footer > button.btn.btn-primary")
				?.setAttribute("disabled", "true");
			createSnackBar({
				message: `EWT<br/>Fehler beim Finden eines Freien Tages.`,
				status: "error",
				timeout: 3000,
				fixed: true,
			});
			throw new Error("Fehler beim Finden eines Freien Tages");
		}
	} while (vorhandeTage.has(tag));

	eingabefeldTagE.value = dayjs([
		Storage.get<number>("Jahr", { check: true }),
		Storage.get<number>("Monat", { check: true }) - 1,
		tag,
	]).format("YYYY-MM-DD");
}
