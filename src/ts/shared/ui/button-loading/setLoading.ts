import { setButtonLoading } from './buttonLoadingStore';

/**
 * Startet den Ladezustand eines Buttons und blendet die Ladeanzeige `#ladeAnzeige` ein (Gegenstueck: `clearLoading`).
 * `DBLoadingButton`s laufen ueber den Store (der Button zeigt dann einen `DBLoadingIndicator`); jeder andere Button
 * wird nur gesperrt -- Buttons mit sichtbarem Ladezustand muessen `DBLoadingButton` sein.
 *
 * @param btn - Id des Buttons (ohne `#`); ohne passendes Element wird nur die Ladeanzeige eingeblendet.
 */
export default function setLoading(btn: string): void {
  const ladeAnzeige = document.querySelector<HTMLDivElement>('#ladeAnzeige');
  if (ladeAnzeige) ladeAnzeige.hidden = false;

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  // `DBLoadingButton` markiert sich per `data-react-loading` selbst und liest den Zustand aus dem Store
  // (`replaceChildren` o. ae. am Button wuerde den React-Baum unterlaufen).
  if (btnElement.dataset['reactLoading'] === 'true') {
    setButtonLoading(btn, true);
    return;
  }

  btnElement.disabled = true;
}
