const originalButtonContent = new Map<string, Node[]>();

function cloneNodes(nodes: Node[]): Node[] {
  return nodes.map(node => node.cloneNode(true));
}

function isAutoSaveBadgeNode(node: Node): boolean {
  return node instanceof HTMLElement && node.classList.contains('autosave-badge');
}

export function rememberOriginalButtonContent(buttonId: string, button: HTMLButtonElement): void {
  if (originalButtonContent.has(buttonId)) return;
  const nonBadgeNodes = Array.from(button.childNodes).filter(node => !isAutoSaveBadgeNode(node));
  originalButtonContent.set(buttonId, cloneNodes(nonBadgeNodes));
}

export function takeOriginalButtonContent(buttonId: string): Node[] | null {
  const nodes = originalButtonContent.get(buttonId);
  if (!nodes) return null;
  originalButtonContent.delete(buttonId);
  return cloneNodes(nodes);
}
