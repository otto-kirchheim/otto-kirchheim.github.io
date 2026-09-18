import { mount, unmount } from '@/infrastructure/ui';

import Storage from '@/infrastructure/storage/Storage';
import OnboardingGuidePanel from './OnboardingGuidePanel';

const PANEL_ID = 'onboarding-guide-panel';

function openGuidePanel(captureSnapshot: boolean): void {
  if (document.querySelector(`#${PANEL_ID}`)) return;

  const container = document.createElement('div');
  container.id = PANEL_ID;
  // z-index 1040: unter den Dialogen (nativer `<dialog>` liegt in der Top-Layer), damit
  // Add/Edit-Dialoge darueber oeffnen.
  container.className = 'position-fixed bottom-0 end-0 p-2 p-md-3 onboarding-panel';
  container.style.zIndex = '1040';
  document.body.appendChild(container);

  const close = () => {
    unmount(container);
    container.remove();
  };

  mount(container, <OnboardingGuidePanel captureSnapshot={captureSnapshot} onClose={close} />);
}

export function openOnboardingGuide(): void {
  openGuidePanel(false);
}

export function openOnboardingGuideOnce(): void {
  if (Storage.get<boolean>('OnboardingAbgeschlossen', { default: false })) return;
  Storage.set('OnboardingAbgeschlossen', true);
  openGuidePanel(true);
}
