/**
 * Blendet den Nachtschicht-Feldblock (`#nachtschicht`) aus, solange die Checkbox `#nacht` nicht gesetzt ist.
 * Fehlt eines der beiden Elemente, passiert nichts.
 *
 * @param parentElement - Modal-Wurzel mit `#nacht` (Checkbox) und `#nachtschicht` (Feldblock).
 */
export default function hideBereitschaftsNachtfelder(parentElement: HTMLDivElement): void {
  const nachtCheckbox = parentElement.querySelector<HTMLInputElement>('#nacht');
  const nachtschichtDiv = parentElement.querySelector<HTMLDivElement>('#nachtschicht');
  if (nachtCheckbox && nachtschichtDiv) nachtschichtDiv.style.display = nachtCheckbox.checked ? '' : 'none';
}
