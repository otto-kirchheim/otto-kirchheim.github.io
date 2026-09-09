import { rememberOriginalButtonContent } from './loadingButtonState';

export default function setLoading(btn: string): void {
  document.querySelector<HTMLDivElement>('#ladeAnzeige')?.classList.remove('d-none');

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  rememberOriginalButtonContent(btn, btnElement);

  // Die DB-Knoepfe sind `inline-size: fit-content` -- ohne Fixierung schrumpft der Knopf
  // waehrend des Ladens auf die Breite des Spinners (~37px statt ~106px) und "springt".
  // `min-inline-size` haelt die Ausgangsbreite; `justify-content: center` (db-button)
  // zentriert den Spinner darin.
  const breite = btnElement.getBoundingClientRect().width;
  if (breite > 0 && !btnElement.style.minInlineSize) {
    btnElement.style.minInlineSize = `${Math.ceil(breite)}px`;
  }

  const spinner = document.createElement('span');
  spinner.className = 'laedt';
  spinner.dataset['size'] = 'small';
  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-hidden', 'true');

  btnElement.disabled = true;
  const badge = btnElement.querySelector<HTMLSpanElement>('.autosave-badge');
  if (badge) {
    btnElement.replaceChildren(spinner, badge);
  } else {
    btnElement.replaceChildren(spinner);
  }
}
