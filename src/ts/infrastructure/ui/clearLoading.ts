import { takeOriginalButtonContent } from './loadingButtonState';

export default function clearLoading(btn: string, resetLoader: boolean = true): void {
  if (resetLoader) document.querySelector<HTMLDivElement>('#ladeAnzeige')?.classList.add('d-none');

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

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

  // Fallback prevents "undefined" labels when a button was never put into loading state.
  const fallbackText = btn === 'btnLogin' ? 'Anmelden' : btnElement.textContent?.trim() || '';
  const normalText = btnElement.dataset.normaltext?.trim() || fallbackText;
  if (badge) {
    btnElement.replaceChildren(document.createTextNode(normalText), badge);
  } else {
    btnElement.textContent = normalText;
  }
  btnElement.disabled = false;
}
