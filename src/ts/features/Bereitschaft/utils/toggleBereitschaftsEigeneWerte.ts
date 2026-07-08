import { applyBereitschaftsVorgabe } from '.';
import type { IVorgabenUvorgabenB } from '@/types';
import type dayjs from '@/infrastructure/date/configDayjs';

/**
 * Schalter „Datum & Zeiten manuell anpassen": ent-/sperrt die berechneten Datumsfelder (bE/nA/nE)
 * und die BZ-Grenzzeiten (bAT/bET) — z. B. für stundenweise Bereitschafts-Übernahme.
 * Nacht-/Spät-Zeiten bleiben immer aus der Arbeitszeit abgeleitet (Override-Editor), da auch die
 * Berechnung die Nacht-Blöcke daraus zieht — manuelle Werte würden ihr widersprechen.
 */
export default function toggleBereitschaftsEigeneWerte(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
): void {
  const bATInput = parentElement.querySelector<HTMLInputElement>('#bAT');
  const bEInput = parentElement.querySelector<HTMLInputElement>('#bE');
  const bETInput = parentElement.querySelector<HTMLInputElement>('#bET');
  const nAInput = parentElement.querySelector<HTMLInputElement>('#nA');
  const nEInput = parentElement.querySelector<HTMLInputElement>('#nE');
  const eigenCheckbox = parentElement.querySelector<HTMLInputElement>('#eigen');

  if (!bATInput || !bEInput || !bETInput || !nAInput || !nEInput || !eigenCheckbox)
    throw new Error('Input Element nicht gefunden');

  const disable: boolean = !eigenCheckbox.checked;

  bATInput.disabled = disable;
  bEInput.disabled = disable;
  bETInput.disabled = disable;
  nAInput.disabled = disable;
  nEInput.disabled = disable;

  parentElement.querySelectorAll<HTMLElement>('.berechnet-badge').forEach(badge => {
    badge.style.display = disable ? '' : 'none';
  });

  // Zurück auf „berechnet": Datums- und Zeitfelder aus der Vorgabe neu ableiten.
  if (disable) applyBereitschaftsVorgabe(parentElement, vorgabenB, datum);
}
