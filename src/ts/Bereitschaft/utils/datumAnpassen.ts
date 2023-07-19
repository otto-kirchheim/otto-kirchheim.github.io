import type { IVorgabenUvorgabenB } from "../../interfaces";
import dayjs from "../../utilities/configDayjs";

export default function datumAnpassen(
	parentElement: HTMLDivElement,
	vorgabenB: IVorgabenUvorgabenB,
	datum: dayjs.Dayjs,
): void {
	const bE = parentElement.querySelector<HTMLInputElement>("#bE");
	const bET = parentElement.querySelector<HTMLInputElement>("#bET");
	const nA = parentElement.querySelector<HTMLInputElement>("#nA");
	const nAT = parentElement.querySelector<HTMLInputElement>("#nAT");
	const nE = parentElement.querySelector<HTMLInputElement>("#nE");
	const nET = parentElement.querySelector<HTMLInputElement>("#nET");

	if (!bE || !bET || !nA || !nAT || !nE || !nET) throw new Error("Element not found");

	bE.value = datum
		.isoWeekday(vorgabenB.endeB.tag)
		.add(vorgabenB.endeB.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	bET.value = vorgabenB.endeB.zeit;
	nA.value = datum
		.isoWeekday(vorgabenB.beginnN.tag)
		.add(vorgabenB.beginnN.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	nAT.value = vorgabenB.beginnN.zeit;
	nE.value = datum
		.isoWeekday(vorgabenB.endeN.tag)
		.add(vorgabenB.endeN.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	nET.value = vorgabenB.endeN.zeit;
}
