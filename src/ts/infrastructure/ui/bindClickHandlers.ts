/**
 * Bindet mehrere Click-Handler an Buttons per ID und liefert eine Cleanup-Funktion, die alle
 * wieder entfernt — spart die sonst pro Button wiederholte
 * `querySelector`/`addEventListener`/`removeEventListener`-Zeremonie in den Feature-Tabs.
 * Der Handler bekommt das (ggf. `null`) Button-Element übergeben, da manche Aufrufer es selbst
 * brauchen (z.B. `saveDaten(btn)`/`generatePDF(btn, ...)` für die Disabled-State-Steuerung).
 * Die Handler-Logik selbst (z.B. Jahres-Gates) bleibt beim Aufrufer.
 */
export function bindClickHandlers(
  entries: [id: string, handler: (button: HTMLButtonElement | null) => void][],
): () => void {
  const bound = entries.map(([id, handler]) => {
    const el = document.querySelector<HTMLButtonElement>(`#${id}`);
    const listener = () => handler(el);
    el?.addEventListener('click', listener);
    return [el, listener] as const;
  });

  return () => {
    bound.forEach(([el, listener]) => el?.removeEventListener('click', listener));
  };
}
