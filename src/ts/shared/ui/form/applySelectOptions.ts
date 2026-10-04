interface SelectOption {
  value?: string | number;
  text: string;
  disabled?: boolean;
  selected?: boolean;
}

/**
 * Baut die `<option>`-Elemente eines `<select>` neu auf, ohne die React-Render-Bäume anzufassen.
 * Die bisherige Auswahl bleibt erhalten, sofern sie unter den neuen Optionen noch vorkommt; sonst gilt die Option mit `selected`.
 *
 * @param select - Zu befüllendes Select-Element.
 * @param options - Neue Optionen.
 */
export default function applySelectOptions(select: HTMLSelectElement, options: SelectOption[]): void {
  const previousValue = select.value;
  select.innerHTML = '';

  options.forEach(option => {
    const optionEl = document.createElement('option');
    optionEl.value = String(option.value ?? '');
    optionEl.textContent = option.text;
    optionEl.disabled = Boolean(option.disabled);
    select.appendChild(optionEl);
  });

  if (options.some(option => String(option.value ?? '') === previousValue)) {
    select.value = previousValue;
    return;
  }
  const fallback = options.find(option => option.selected);
  if (fallback) select.value = String(fallback.value ?? '');
}
