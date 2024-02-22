import { BerVorgabeAEndern } from ".";
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

	const disable: boolean = !eigenCheckbox.checked;

	bATInput.disabled = disable;
	bEInput.disabled = disable;
	bETInput.disabled = disable;
	nAInput.disabled = disable;
	nATInput.disabled = disable;
	nEInput.disabled = disable;
	nETInput.disabled = disable;

	if (disable) BerVorgabeAEndern(parentElement, vorgabenB, datum);
}
