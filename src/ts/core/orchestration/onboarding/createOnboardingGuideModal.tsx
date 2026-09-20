import { mount, unmount } from '@/infrastructure/ui';

import Storage from '@/infrastructure/storage/Storage';
import OnboardingGuidePanel from './OnboardingGuidePanel';

const PANEL_ID = 'onboarding-guide-panel';

/**
 * Mountet das Ersteinrichtungs-Panel unten rechts am Body; ist es schon offen, passiert nichts.
 *
 * @param captureSnapshot - Ob das Panel den Snapshot der Template-Werte anlegen soll.
 */
function openGuidePanel(captureSnapshot: boolean): void {
  if (document.querySelector(`#${PANEL_ID}`)) return;

  const container = document.createElement('div');
  container.id = PANEL_ID;
  // z-index 1040: unter den Dialogen (nativer `<dialog>` liegt in der Top-Layer), damit
  // Add/Edit-Dialoge darueber oeffnen.
  container.className = 'position-fixed bottom-0 end-0 p-2 p-md-3 onboarding-panel';
  container.style.zIndex = '1040';
  document.body.appendChild(container);

  /** Entfernt das Panel wieder aus dem DOM. */
  const close = () => {
    unmount(container);
    container.remove();
  };

  mount(container, <OnboardingGuidePanel captureSnapshot={captureSnapshot} onClose={close} />);
}

/** Oeffnet die Ersteinrichtung (z. B. ueber die Hilfe), unabhaengig davon, ob sie schon abgeschlossen wurde. */
export function openOnboardingGuide(): void {
  openGuidePanel(false);
}

/** Oeffnet die Ersteinrichtung nur beim ersten Mal und merkt sich das im Storage (`OnboardingAbgeschlossen`). */
export function openOnboardingGuideOnce(): void {
  if (Storage.get<boolean>('OnboardingAbgeschlossen', { default: false })) return;
  Storage.set('OnboardingAbgeschlossen', true);
  openGuidePanel(true);
}
