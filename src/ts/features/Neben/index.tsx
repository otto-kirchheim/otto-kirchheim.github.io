import { onEvent } from '@/core';
import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { syncNebengeldTimesFromEwtRows } from './utils';
import { NebenTab } from './NebenTab';

// Bleibt bewusst außerhalb von register()/unregister(): syncNebengeldTimesFromEwtRows aktualisiert
// Storage.dataN unabhängig vom DOM und muss auch synchronisieren, wenn Neben gerade nicht gemountet ist
// (Neben deaktiviert, EWT aber aktiv) — sonst driften verknüpfte Nebengeld-Zeiten (EWT) unbemerkt.
onEvent('ewt:persisted', ({ rows }) => syncNebengeldTimesFromEwtRows(rows));

/**
 * Rendert den Neben-Tab in `#neben-root`; ohne den Container passiert nichts.
 */
function mountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  mount(container, <NebenTab />);
}

/**
 * Entfernt den Neben-Tab aus `#neben-root`; ohne den Container passiert nichts.
 */
function unmountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'Neben',
  /**
   * Lifecycle-Hook: mountet den Tab, sobald das Feature aktiv wird.
   */
  async register(): Promise<void> {
    mountNebenTab();
  },
  /**
   * Lifecycle-Hook: unmountet den Tab, wenn das Feature abgebaut wird.
   */
  async unregister(): Promise<void> {
    unmountNebenTab();
  },
});
