import { setButtonLoading } from './buttonLoadingStore';
import { takeOriginalButtonContent } from './loadingButtonState';

/**
 * Beendet den Ladezustand eines Buttons (Gegenstueck zu `setLoading`) und blendet optional die
 * Ladeanzeige `#ladeAnzeige` aus. `DBLoadingButton`s laufen ueber den Store, native Buttons
 * bekommen ihren urspruenglichen Inhalt (bzw. `data-normaltext`) zurueck; ein vorhandenes
 * `.autosave-badge` bleibt erhalten.
 *
 * @param btn - Id des Buttons (ohne `#`).
 * @param resetLoader - `true` (Standard) blendet zusaetzlich `#ladeAnzeige` aus.
 */
export default function clearLoading(btn: string, resetLoader: boolean = true): void {
  if (resetLoader) document.querySelector<HTMLDivElement>('#ladeAnzeige')?.classList.add('d-none');

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  // Ladebreiten-Fixierung aus `setLoading` wieder loesen.
  btnElement.style.minInlineSize = '';

  if (btnElement.dataset['reactLoading'] === 'true') {
    setButtonLoading(btn, false);
    return;
  }

  const badge = btnElement.querySelector<HTMLSpanElement>('.autosave-badge');

  const originalContent = takeOriginalButtonContent(btn);
  if (originalContent) {
    if (badge) {
      btnElement.replaceChildren(...originalContent, badge);
    } else {
      btnElement.replaceChildren(...originalContent);
    }
    btnElement.disabled = false;
    return;
  }

  // Fallback, damit keine "undefined"-Beschriftung entsteht, falls der Button nie im Ladezustand war.
  const fallbackText = btnElement.textContent?.trim() || '';
  const normalText = btnElement.dataset.normaltext?.trim() || fallbackText;
  if (badge) {
    btnElement.replaceChildren(document.createTextNode(normalText), badge);
  } else {
    btnElement.textContent = normalText;
  }
  btnElement.disabled = false;
}
