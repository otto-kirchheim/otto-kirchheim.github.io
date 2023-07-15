import type { IVorgabenUvorgabenB } from "../../interfaces";
import dayjs from "../../utilities/configDayjs";
import nachtAusblenden from "./nachtAusblenden";

export default function bereitschaftsVorgabeAEndern(
	parentElement: HTMLDivElement,
	vorgabenB: IVorgabenUvorgabenB,
	datum = dayjs(parentElement.querySelector<HTMLInputElement>("#bA")?.value) ?? null,
): void {
	if (!datum) throw new Error("Datum nicht gefunden");

	const bAInput = parentElement.querySelector<HTMLInputElement>("#bA");
	const bATInput = parentElement.querySelector<HTMLInputElement>("#bAT");
	const bEInput = parentElement.querySelector<HTMLInputElement>("#bE");
	const bETInput = parentElement.querySelector<HTMLInputElement>("#bET");
	const nachtInput = parentElement.querySelector<HTMLInputElement>("#nacht");
	const nAInput = parentElement.querySelector<HTMLInputElement>("#nA");
	const nATInput = parentElement.querySelector<HTMLInputElement>("#nAT");
	const nEInput = parentElement.querySelector<HTMLInputElement>("#nE");
	const nETInput = parentElement.querySelector<HTMLInputElement>("#nET");

	if (!bAInput || !bATInput || !bEInput || !bETInput || !nachtInput || !nAInput || !nATInput || !nEInput || !nETInput) {
		throw new Error("Input Element nicht gefunden");
	}

	bAInput.value = datum.isoWeekday(vorgabenB.beginnB.tag).format("YYYY-MM-DD");
	bATInput.value = vorgabenB.beginnB.zeit;
	bEInput.value = datum
		.isoWeekday(vorgabenB.endeB.tag)
		.add(vorgabenB.endeB.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	bETInput.value = vorgabenB.endeB.zeit;
	nachtInput.checked = vorgabenB.nacht;
	nAInput.value = datum
		.isoWeekday(vorgabenB.beginnN.tag)
		.add(vorgabenB.beginnN.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	nATInput.value = vorgabenB.beginnN.zeit;
	nEInput.value = datum
		.isoWeekday(vorgabenB.endeN.tag)
		.add(vorgabenB.endeN.Nwoche ? 7 : 0, "d")
		.format("YYYY-MM-DD");
	nETInput.value = vorgabenB.endeN.zeit;

	nachtAusblenden(parentElement);
}
