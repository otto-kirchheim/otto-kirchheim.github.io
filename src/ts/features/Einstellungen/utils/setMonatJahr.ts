import dayjs from '@/infrastructure/date/configDayjs';

export default function setMonatJahr(jahr: number, monat: number): void {
  const inputMonat = document.querySelector<HTMLInputElement>('#Monat');
  const headingMonatB = document.querySelector<HTMLHeadingElement>('#MonatB');
  const headingMonatE = document.querySelector<HTMLHeadingElement>('#MonatE');
  const headingMonatN = document.querySelector<HTMLHeadingElement>('#MonatN');
  const headingMonatBerechnung = document.querySelector<HTMLHeadingElement>('#MonatBerechnung');

  // Bereitschaft/EWT/Neben sind je nach aktivierteTabs conditional gemountet — ihre Headings können fehlen,
  // ohne dass das den Monatswechsel für die restliche App (u. a. Berechnung, immer gemountet) blockieren darf.
  if (!inputMonat || !headingMonatBerechnung) throw new Error('One or more elements not found.');

  inputMonat.value = monat.toString();
  const datum = dayjs([+jahr, monat - 1]);
  const monatLabel = datum.format('MM / YY');
  if (headingMonatB) headingMonatB.innerText = monatLabel;
  if (headingMonatE) headingMonatE.innerText = monatLabel;
  if (headingMonatN) headingMonatN.innerText = monatLabel;
  headingMonatBerechnung.innerText = jahr.toString();
}
