import { Storage, buttonDisable, setDisableButton } from "../../utilities";

export default function changeMonatJahr(): void {
	const monatInput = document.querySelector<HTMLInputElement>("#Monat");
	const jahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	if (
		monatInput &&
		jahrInput &&
		monatInput.value === Storage.get<number>("Monat").toString() &&
		jahrInput.value === Storage.get<number>("Jahr").toString()
	) {
		buttonDisable(false);
		if (!navigator.onLine) setDisableButton(true);
		return;
	}
	buttonDisable(true);
	const auswaehlenBtn = document.querySelector<HTMLButtonElement>("#btnAuswaehlen");
	if (navigator.onLine && auswaehlenBtn) auswaehlenBtn.disabled = false;
}
