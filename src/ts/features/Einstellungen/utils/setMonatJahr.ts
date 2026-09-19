import dayjs from '@/infrastructure/date/configDayjs';

/**
 * Schreibt Monat/Jahr in die Ueberschriften der Tabs -- fuer alle, die gerade gemountet sind.
 * Wirft nie: Bereitschaft/EWT/Neben/EA mounten je nach `aktivierteTabs` erst NACH dem Laden der Daten
 * (`syncFeatureTabs`), der Text wird von aussen ins DOM geschrieben und geht mit einem Remount
 * verloren -- deshalb ruft `syncFeatureTabs` diese Funktion nach jedem Mounten erneut auf.
 */
export function setMonatsUeberschriften(jahr: number, monat: number): void {
  const monatLabel = dayjs([+jahr, monat - 1]).format('MM / YY');
  for (const id of ['MonatB', 'MonatE', 'MonatN', 'MonatEA']) {
    const heading = document.querySelector<HTMLHeadingElement>(`#${id}`);
    if (heading) heading.innerText = monatLabel;
  }
  const headingBerechnung = document.querySelector<HTMLHeadingElement>('#MonatBerechnung');
  if (headingBerechnung) headingBerechnung.innerText = jahr.toString();
}

export default function setMonatJahr(jahr: number, monat: number): void {
  // `#Monat` existiert seit dem Shell-Umbau zweimal (Desktop- + Mobile-Control-Panel).
  const inputMonatElemente = document.querySelectorAll<HTMLInputElement>('#Monat');
  const headingMonatBerechnung = document.querySelector<HTMLHeadingElement>('#MonatBerechnung');

  // Bereitschaft/EWT/Neben/EA sind je nach aktivierteTabs conditional gemountet -- ihre Headings koennen
  // fehlen, ohne dass das den Monatswechsel fuer die restliche App (u. a. Berechnung, immer gemountet)
  // blockieren darf.
  if (inputMonatElemente.length === 0 || !headingMonatBerechnung) throw new Error('One or more elements not found.');

  inputMonatElemente.forEach(el => (el.value = monat.toString()));
  setMonatsUeberschriften(jahr, monat);
}
