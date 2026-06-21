import { applyBereitschaftsVorgabe } from '.';
import type { IVorgabenUvorgabenB } from '@/types';
import type dayjs from '@/infrastructure/date/configDayjs';

/**
 * Schalter „Datum manuell anpassen": ent-/sperrt ausschließlich die berechneten Datumsfelder
 * (bE/nA/nE). Die Zeiten sind generell read-only und werden über den Override-Editor geändert.
 */
export default function toggleBereitschaftsEigeneWerte(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
): void {
  const bEInput = parentElement.querySelector<HTMLInputElement>('#bE');
  const nAInput = parentElement.querySelector<HTMLInputElement>('#nA');
  const nEInput = parentElement.querySelector<HTMLInputElement>('#nE');
  const eigenCheckbox = parentElement.querySelector<HTMLInputElement>('#eigen');

  if (!bEInput || !nAInput || !nEInput || !eigenCheckbox) throw new Error('Input Element nicht gefunden');

  const disable: boolean = !eigenCheckbox.checked;

  bEInput.disabled = disable;
  nAInput.disabled = disable;
  nEInput.disabled = disable;

  parentElement.querySelectorAll<HTMLElement>('.berechnet-badge').forEach(badge => {
    badge.style.display = disable ? '' : 'none';
  });

  // Zurück auf „berechnet": Datumsfelder aus der Vorgabe neu ableiten.
  if (disable) applyBereitschaftsVorgabe(parentElement, vorgabenB, datum);
}
