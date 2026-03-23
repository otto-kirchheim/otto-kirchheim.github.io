import { rememberOriginalButtonContent } from './loadingButtonState';

export default function setLoading(btn: string): void {
  document.querySelector<HTMLDivElement>('#ladeAnzeige')?.classList.remove('d-none');

  const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
  if (!btnElement) return;

  rememberOriginalButtonContent(btn, btnElement);

  const spinner = document.createElement('span');
  spinner.className = 'spinner-grow spinner-grow-sm';
  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-hidden', 'true');

  btnElement.disabled = true;
  btnElement.replaceChildren(spinner);
}
