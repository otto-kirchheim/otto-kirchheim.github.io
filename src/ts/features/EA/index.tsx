import { onEvent } from '@/core';
import { featureLifecycleRegistry } from '@/core/hooks';
import { mount, unmount } from '@/infrastructure/ui';
import { syncEaDurationFromEwtRows } from './utils';
import { EaTab } from './EaTab';

// Bewusst außerhalb von register()/unregister(): syncEaDurationFromEwtRows aktualisiert Storage.dataEA
// unabhängig vom DOM und muss auch bei nicht gemountetem EA (EA deaktiviert, EWT aktiv) laufen,
// sonst driften verknüpfte EA-Dauern unbemerkt.
onEvent('ewt:persisted', ({ rows }) => syncEaDurationFromEwtRows(rows));

/** Mountet den EA-Tab in `#ea-root`; ohne Container passiert nichts. */
function mountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  mount(container, <EaTab />);
}

/** Unmountet den EA-Tab aus `#ea-root`; ohne Container passiert nichts. */
function unmountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  unmount(container);
}

featureLifecycleRegistry.registerFeature({
  name: 'EA',
  /** Mountet den Tab beim Aktivieren des Features. */
  async register(): Promise<void> {
    mountEaTab();
  },
  /** Unmountet den Tab beim Deaktivieren des Features. */
  async unregister(): Promise<void> {
    unmountEaTab();
  },
});
