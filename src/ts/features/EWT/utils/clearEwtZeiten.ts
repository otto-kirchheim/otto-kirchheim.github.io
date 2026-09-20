import type { CustomHTMLDivElement, IDatenEWT } from '@/types';

/**
 * Leert die acht Zeitfelder (`abWE` bis `anWE`) im EWT-Editor.
 *
 * @param modal - Editor-Modal mit den Zeit-Eingabefeldern.
 */
export default function clearEwtZeiten(modal: CustomHTMLDivElement<IDatenEWT>): void {
  const inputIds = ['abWE', 'ab1E', 'anEE', 'beginE', 'endeE', 'abEE', 'an1E', 'anWE'];
  inputIds.forEach(id => {
    const input = modal.querySelector<HTMLInputElement>(`#${id}`);
    if (input) input.value = '';
  });
}
