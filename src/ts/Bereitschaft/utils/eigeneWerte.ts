import { bereitschaftsVorgabeAEndern } from ".";
import type { IVorgabenUvorgabenB } from "../../interfaces";
import dayjs from "../../utilities/configDayjs";

export default function eigeneWerte(
	parentElement: HTMLDivElement,
	vorgabenB: IVorgabenUvorgabenB,
	datum: dayjs.Dayjs,
): void {
	const bATInput = parentElement.querySelector<HTMLInputElement>("#bAT");
	const bEInput = parentElement.querySelector<HTMLInputElement>("#bE");
	const bETInput = parentElement.querySelector<HTMLInputElement>("#bET");
	const nAInput = parentElement.querySelector<HTMLInputElement>("#nA");
	const nATInput = parentElement.querySelector<HTMLInputElement>("#nAT");
	const nEInput = parentElement.querySelector<HTMLInputElement>("#nE");
	const nETInput = parentElement.querySelector<HTMLInputElement>("#nET");
	const eigenCheckbox = parentElement.querySelector<HTMLInputElement>("#eigen");

	if (!bATInput || !bEInput || !bETInput || !nAInput || !nATInput || !nEInput || !nETInput || !eigenCheckbox)
		throw new Error("Input Element nicht gefunden");

	if (eigenCheckbox.checked) {
		bATInput.disabled = false;
		bEInput.disabled = false;
		bETInput.disabled = false;
		nAInput.disabled = false;
		nATInput.disabled = false;
		nEInput.disabled = false;
		nETInput.disabled = false;
	} else {
		bATInput.disabled = true;
		bEInput.disabled = true;
		bETInput.disabled = true;
		nAInput.disabled = true;
		nATInput.disabled = true;
		nEInput.disabled = true;
		nETInput.disabled = true;
		bereitschaftsVorgabeAEndern(parentElement, vorgabenB, datum);
	}
}
