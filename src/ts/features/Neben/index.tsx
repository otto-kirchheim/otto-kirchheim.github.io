import { onEvent } from '@/core';
import { featureLifecycleRegistry } from '@/core/hooks';
import { syncNebengeldTimesFromEwtRows } from './utils';
import { mountNebenTab, unmountNebenTab } from './NebenTab';

// Bleibt bewusst außerhalb von register()/unregister(): syncNebengeldTimesFromEwtRows aktualisiert
// Storage.dataN unabhängig vom DOM und muss auch synchronisieren, wenn Neben gerade nicht gemountet ist
// (Neben deaktiviert, EWT aber aktiv) — sonst driften verknüpfte Nebengeld-Zeiten (EWT) unbemerkt.
onEvent('ewt:persisted', ({ rows }) => syncNebengeldTimesFromEwtRows(rows));

featureLifecycleRegistry.registerFeature({
  name: 'Neben',
  async register(): Promise<void> {
    mountNebenTab();
  },
  async unregister(): Promise<void> {
    unmountNebenTab();
  },
});
