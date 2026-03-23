const originalButtonContent = new Map<string, Node[]>();

function cloneNodes(nodes: Node[]): Node[] {
  return nodes.map(node => node.cloneNode(true));
}

export function rememberOriginalButtonContent(buttonId: string, button: HTMLButtonElement): void {
  if (originalButtonContent.has(buttonId)) return;
  originalButtonContent.set(buttonId, cloneNodes(Array.from(button.childNodes)));
}

export function takeOriginalButtonContent(buttonId: string): Node[] | null {
  const nodes = originalButtonContent.get(buttonId);
  if (!nodes) return null;
  originalButtonContent.delete(buttonId);
  return cloneNodes(nodes);
}
