import { unmount } from '@/infrastructure/ui';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';

import { MyHelpModal, oeffneDrawer } from '@/components';
import { getHelpContent, type HelpContent, type HelpContextKey } from './helpContent';

/**
 * Öffnet die Hilfe in einem eigenständigen, gestapelten Dialog statt im geteilten
 * `#modal`-Element. So bleibt ein evtl. bereits geöffnetes Add/Edit-Modal (oder der
 * Ersteinrichtungs-Guide) beim Öffnen/Schließen der Hilfe unangetastet erhalten --
 * `<dialog>` stapelt dafür nativ über die Top-Layer. Beim Schließen wird der Container entfernt.
 *
 * Der Text eines Features kommt aus dessen lazy Teil `help`; ein Ladefehler oder ein unbekannter Schluessel
 * zeigt eine Snackbar statt des Dialogs. Die Funktion wirft nie.
 *
 * @param key - Hilfe-Kontext, dessen Inhalt angezeigt wird.
 */
export async function openHelpModal(key: HelpContextKey): Promise<void> {
  let content: HelpContent | undefined;
  try {
    content = await getHelpContent(key);
  } catch (error) {
    console.error(`Hilfe '${key}' konnte nicht geladen werden:`, error);
  }
  if (!content) {
    createSnackBar({
      message: 'Die Hilfe konnte nicht geladen werden.',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);

  oeffneDrawer(container, <MyHelpModal content={content} />, () => {
    unmount(container);
    container.remove();
  });
}
