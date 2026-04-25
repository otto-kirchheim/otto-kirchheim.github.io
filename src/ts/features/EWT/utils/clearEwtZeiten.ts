import type { CustomHTMLDivElement, IDatenEWT } from '../../../core/types';

export default function clearEwtZeiten(modal: CustomHTMLDivElement<IDatenEWT>): void {
  const inputIds = ['abWE', 'ab1E', 'anEE', 'beginE', 'endeE', 'abEE', 'an1E', 'anWE'];
  inputIds.forEach(id => {
    const input = modal.querySelector<HTMLInputElement>(`#${id}`);
    if (input) input.value = '';
  });
}
