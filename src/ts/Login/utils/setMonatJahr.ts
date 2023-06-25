import dayjs from "../../utilities/configDayjs";

export default function setMonatJahr(jahr: number, monat: number): void {
	const inputMonat = document.querySelector<HTMLInputElement>("#Monat");
	const headingMonatB = document.querySelector<HTMLHeadingElement>("#MonatB");
	const headingMonatE = document.querySelector<HTMLHeadingElement>("#MonatE");
	const headingMonatN = document.querySelector<HTMLHeadingElement>("#MonatN");
	const headingMonatBerechnung = document.querySelector<HTMLHeadingElement>("#MonatBerechnung");

	if (!inputMonat || !headingMonatB || !headingMonatE || !headingMonatN || !headingMonatBerechnung) {
		throw new Error("One or more elements not found.");
	}

	inputMonat.value = monat.toString();
	const datum = dayjs([+jahr, monat - 1]);
	headingMonatB.innerText = headingMonatE.innerText = headingMonatN.innerText = datum.format("MM / YY");
	headingMonatBerechnung.innerText = jahr.toString();
}
