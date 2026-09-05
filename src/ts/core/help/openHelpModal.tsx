import Modal from 'bootstrap/js/dist/modal';
import { mount, unmount } from '@/infrastructure/ui';

import { MyHelpModal } from '@/components';
import { getHelpContent, type HelpContextKey } from './helpContent';

/**
 * Öffnet die Hilfe in einem eigenständigen, gestapelten Bootstrap-Modal statt im geteilten
 * `#modal`-Element. So bleibt ein evtl. bereits geöffnetes Add/Edit-Modal (oder der
 * Ersteinrichtungs-Guide) beim Öffnen/Schließen der Hilfe unangetastet erhalten.
 */
export function openHelpModal(key: HelpContextKey): void {
  const container = document.createElement('div');
  container.className = 'modal fade';
  container.setAttribute('tabindex', '-1');
  document.body.appendChild(container);

  mount(container, <MyHelpModal content={getHelpContent(key)} />);

  const bsModal = new Modal(container);
  container.addEventListener(
    'hidden.bs.modal',
    () => {
      unmount(container);
      bsModal.dispose();
      container.remove();
    },
    { once: true },
  );

  bsModal.show();
}
