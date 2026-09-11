import { setButtonLoading } from './buttonLoadingStore';
import { rememberOriginalButtonContent } from './loadingButtonState';

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

  // `DBLoadingButton` markiert sich selbst -- der Ladezustand laeuft dann ueber den
  // Store/Hook (deklarativ, React bleibt Herr ueber seine Kindknoten). Siehe
  // `buttonLoadingStore.ts` fuer den Hintergrund (`replaceChildren` wuerde den React-Tree
  // unterlaufen).
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
