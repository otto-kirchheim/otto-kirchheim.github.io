import { unmount } from '@/infrastructure/ui';

import { MyHelpModal, oeffneDrawer } from '@/components';
import { getHelpContent, type HelpContextKey } from './helpContent';

/**
 * Öffnet die Hilfe in einem eigenständigen, gestapelten Dialog statt im geteilten
 * `#modal`-Element. So bleibt ein evtl. bereits geöffnetes Add/Edit-Modal (oder der
 * Ersteinrichtungs-Guide) beim Öffnen/Schließen der Hilfe unangetastet erhalten --
 * `<dialog>` stapelt dafür nativ über die Top-Layer. Beim Schließen wird der Container entfernt.
 *
 * @param key - Hilfe-Kontext, dessen Inhalt angezeigt wird.
 */
export function openHelpModal(key: HelpContextKey): void {
  const container = document.createElement('div');
  document.body.appendChild(container);

  oeffneDrawer(container, <MyHelpModal content={getHelpContent(key)} />, () => {
    unmount(container);
    container.remove();
  });
}
