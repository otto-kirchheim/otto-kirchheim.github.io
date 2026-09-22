/** Urspruenglicher Inhalt (ohne AutoSave-Badge) nativer Buttons je Button-Id, solange sie laden. */
const originalButtonContent = new Map<string, Node[]>();

/**
 * Klont die Knoten tief.
 *
 * @param nodes - Zu klonende Knoten.
 * @returns Tiefe Kopien in gleicher Reihenfolge.
 */
function cloneNodes(nodes: Node[]): Node[] {
  return nodes.map(node => node.cloneNode(true));
}

/**
 * Prueft, ob der Knoten das AutoSave-Badge (`.autosave-badge`) ist.
 *
 * @param node - Zu pruefender Knoten.
 * @returns `true` beim Badge-Element.
 */
function isAutoSaveBadgeNode(node: Node): boolean {
  return node instanceof HTMLElement && node.classList.contains('autosave-badge');
}

/**
 * Merkt sich den Inhalt eines Buttons vor dem Ladezustand (ohne AutoSave-Badge, das beim Laden erhalten bleibt).
 * Ein bereits gemerkter Inhalt wird nicht ueberschrieben, damit ein wiederholtes `setLoading` den Spinner nicht als Original ablegt.
 *
 * @param buttonId - Button-Id (ohne `#`).
 * @param button - Button, dessen Kindknoten gemerkt werden.
 */
export function rememberOriginalButtonContent(buttonId: string, button: HTMLButtonElement): void {
  if (originalButtonContent.has(buttonId)) return;
  const nonBadgeNodes = Array.from(button.childNodes).filter(node => !isAutoSaveBadgeNode(node));
  originalButtonContent.set(buttonId, cloneNodes(nonBadgeNodes));
}

/**
 * Entnimmt den gemerkten Inhalt und vergisst ihn.
 *
 * @param buttonId - Button-Id (ohne `#`).
 * @returns Geklonte Knoten zum Wiederherstellen; `null`, wenn nichts gemerkt ist.
 */
export function takeOriginalButtonContent(buttonId: string): Node[] | null {
  const nodes = originalButtonContent.get(buttonId);
  if (!nodes) return null;
  originalButtonContent.delete(buttonId);
  return cloneNodes(nodes);
}
