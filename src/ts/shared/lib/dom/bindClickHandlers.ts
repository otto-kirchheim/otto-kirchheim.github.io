/**
 * Bindet mehrere Click-Handler per Button-ID und liefert eine Cleanup-Funktion, die alle wieder
 * entfernt. Der Handler bekommt das Button-Element uebergeben (`null`, wenn die Id nicht im DOM
 * ist), weil manche Aufrufer es selbst brauchen (z.B. `saveDaten(btn)`/`generatePDF(btn, ...)`
 * fuer die Disabled-State-Steuerung). Die Handler-Logik selbst bleibt beim Aufrufer.
 *
 * @param entries - Paare aus Button-Id (ohne `#`) und Handler.
 * @returns Cleanup-Funktion, die alle gebundenen Listener entfernt.
 */
export function bindClickHandlers(
  entries: [id: string, handler: (button: HTMLButtonElement | null) => void][],
): () => void {
  const bound = entries.map(([id, handler]) => {
    const el = document.querySelector<HTMLButtonElement>(`#${id}`);
    /** Ruft den Handler mit dem beim Binden gefundenen Button auf. */
    const listener = () => handler(el);
    el?.addEventListener('click', listener);
    return [el, listener] as const;
  });

  return () => {
    bound.forEach(([el, listener]) => el?.removeEventListener('click', listener));
  };
}
