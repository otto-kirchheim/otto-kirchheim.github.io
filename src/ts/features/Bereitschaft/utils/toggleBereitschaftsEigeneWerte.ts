import { applyBereitschaftsVorgabe } from '.';
import type { IVorgabenUvorgabenB } from '@/types';
import type dayjs from '@/infrastructure/date/configDayjs';

export default function toggleBereitschaftsEigeneWerte(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
): void {
  const bATInput = parentElement.querySelector<HTMLInputElement>('#bAT');
  const bEInput = parentElement.querySelector<HTMLInputElement>('#bE');
  const bETInput = parentElement.querySelector<HTMLInputElement>('#bET');
  const nAInput = parentElement.querySelector<HTMLInputElement>('#nA');
  const nATInput = parentElement.querySelector<HTMLInputElement>('#nAT');
  const nEInput = parentElement.querySelector<HTMLInputElement>('#nE');
  const nETInput = parentElement.querySelector<HTMLInputElement>('#nET');
  const spaetATInput = parentElement.querySelector<HTMLInputElement>('#spaetAT');
  const spaetETInput = parentElement.querySelector<HTMLInputElement>('#spaetET');
  const spaetInput = parentElement.querySelector<HTMLInputElement>('#spaet');
  const eigenCheckbox = parentElement.querySelector<HTMLInputElement>('#eigen');

  if (!bATInput || !bEInput || !bETInput || !nAInput || !nATInput || !nEInput || !nETInput || !eigenCheckbox)
    throw new Error('Input Element nicht gefunden');

  const disable: boolean = !eigenCheckbox.checked;

  bATInput.disabled = disable;
  bEInput.disabled = disable;
  bETInput.disabled = disable;
  nAInput.disabled = disable;
  nATInput.disabled = disable;
  nEInput.disabled = disable;
  nETInput.disabled = disable;
  const spaetChecked = spaetInput?.checked ?? false;
  if (spaetATInput) spaetATInput.disabled = disable || !spaetChecked;
  if (spaetETInput) spaetETInput.disabled = disable || !spaetChecked;

  parentElement.querySelectorAll<HTMLElement>('.berechnet-badge').forEach(badge => {
    badge.style.display = disable ? '' : 'none';
  });

  if (disable) applyBereitschaftsVorgabe(parentElement, vorgabenB, datum);
}
