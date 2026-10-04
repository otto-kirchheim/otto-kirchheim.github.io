import { setButtonLoading } from './buttonLoadingStore';

/**
 * Beendet den Ladezustand eines Buttons (Gegenstueck zu `setLoading`) und blendet optional die
 * Ladeanzeige `#ladeAnzeige` aus. `DBLoadingButton`s laufen ueber den Store, andere Buttons werden freigegeben.
 *
 * @param btn - Id des Buttons (ohne `#`).
 * @param resetLoader - `true` (Standard) blendet zusaetzlich `#ladeAnzeige` aus.
 */
export default function clearLoading(btn: string, resetLoader: boolean = true): void {
  const ladeAnzeige = document.querySelector<HTMLDivElement>('#ladeAnzeige');
  if (resetLoader && ladeAnzeige) ladeAnzeige.hidden = true;

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  if (btnElement.dataset['reactLoading'] === 'true') {
    setButtonLoading(btn, false);
    return;
  }

  btnElement.disabled = false;
}
