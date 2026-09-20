import { setButtonLoading } from './buttonLoadingStore';
import { rememberOriginalButtonContent } from './loadingButtonState';

/**
 * Startet den Ladezustand eines Buttons und blendet die Ladeanzeige `#ladeAnzeige` ein (Gegenstueck: `clearLoading`).
 * `DBLoadingButton`s laufen ueber den Store, native Buttons werden per DOM auf einen Spinner umgestellt
 * (Original wird gemerkt, ein vorhandenes `.autosave-badge` bleibt).
 *
 * @param btn - Id des Buttons (ohne `#`); ohne passendes Element wird nur die Ladeanzeige eingeblendet.
 */
export default function setLoading(btn: string): void {
  document.querySelector<HTMLDivElement>('#ladeAnzeige')?.classList.remove('d-none');

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  // Die DB-Knoepfe sind `inline-size: fit-content` -- ohne Fixierung schrumpft der Knopf
  // waehrend des Ladens auf die Breite des Spinners (~37px statt ~106px) und "springt".
  // `min-inline-size` haelt die Ausgangsbreite; `justify-content: center` (db-button)
  // zentriert den Spinner darin. Gilt fuer beide Pfade unten, deshalb hier gemeinsam.
  const breite = btnElement.getBoundingClientRect().width;
  if (breite > 0 && !btnElement.style.minInlineSize) {
    btnElement.style.minInlineSize = `${Math.ceil(breite)}px`;
  }

  // `DBLoadingButton` markiert sich per `data-react-loading` selbst -- der Ladezustand laeuft dann
  // ueber den Store (siehe `buttonLoadingStore.ts`; `replaceChildren` wuerde den React-Tree unterlaufen).
  if (btnElement.dataset['reactLoading'] === 'true') {
    setButtonLoading(btn, true);
    return;
  }

  rememberOriginalButtonContent(btn, btnElement);

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
