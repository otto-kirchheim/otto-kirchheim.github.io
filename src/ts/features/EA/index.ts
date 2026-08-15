import { onEvent } from '@/core';
import { featureLifecycleRegistry } from '@/core/hooks';
import { syncEaDurationFromEwtRows } from './utils';
import { mountEaTab, unmountEaTab } from './EaTab';

// Bleibt bewusst außerhalb von register()/unregister(): syncEaDurationFromEwtRows aktualisiert
// Storage.dataEA unabhängig vom DOM und muss auch synchronisieren, wenn EA gerade nicht gemountet ist
// (EA deaktiviert, EWT aber aktiv) — sonst driften verknüpfte EA-Dauern (EWT) unbemerkt.
onEvent('ewt:persisted', ({ rows }) => syncEaDurationFromEwtRows(rows));

featureLifecycleRegistry.registerFeature({
  name: 'EA',
  async register(): Promise<void> {
    mountEaTab();
  },
  async unregister(): Promise<void> {
    unmountEaTab();
  },
});
