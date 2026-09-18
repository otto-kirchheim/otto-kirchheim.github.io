import { onEvent } from '@/core';
import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { syncNebengeldTimesFromEwtRows } from './utils';
import { NebenTab } from './NebenTab';

// Bleibt bewusst außerhalb von register()/unregister(): syncNebengeldTimesFromEwtRows aktualisiert
// Storage.dataN unabhängig vom DOM und muss auch synchronisieren, wenn Neben gerade nicht gemountet ist
// (Neben deaktiviert, EWT aber aktiv) — sonst driften verknüpfte Nebengeld-Zeiten (EWT) unbemerkt.
onEvent('ewt:persisted', ({ rows }) => syncNebengeldTimesFromEwtRows(rows));

function mountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  mount(container, <NebenTab />);
}

function unmountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'Neben',
  async register(): Promise<void> {
    mountNebenTab();
  },
  async unregister(): Promise<void> {
    unmountNebenTab();
  },
});
