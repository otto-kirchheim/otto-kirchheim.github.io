import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from '../reactRender';

const openOnboardingGuideMock = vi.fn();
vi.mock('@/core/orchestration/onboarding/createOnboardingGuideModal', () => ({
  openOnboardingGuide: openOnboardingGuideMock,
}));

// MyHelpModal's Reopen-Button traegt data-bs-dismiss="modal". Der reale Bootstrap-Modal-Import
// registriert einen document-weiten Click-Handler, der ohne echtes .modal-Element crasht.
// Fuer diesen isolierten Komponententest wird das Modul daher wie in MyShowFooter.test.tsx gemockt.

import { getHelpContent } from '@/core/help/helpContent';

const { default: MyHelpModal } = await import('@/components/MyHelpModal');

function renderMyHelpModal(content: Parameters<typeof MyHelpModal>[0]['content']): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyHelpModal content={content} />, container);
  return container;
}

describe('MyHelpModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render a reopen-onboarding action for regular contexts', () => {
    const container = renderMyHelpModal(getHelpContent('tab.ewt'));

    expect(container.textContent).not.toContain('Ersteinrichtung erneut öffnen');
  });

  it('renders and wires the reopen-onboarding action for the start context', () => {
    const container = renderMyHelpModal(getHelpContent('tab.start'));

    const button = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Ersteinrichtung erneut öffnen'),
    );
    expect(button).not.toBeUndefined();
    expect(button?.getAttribute('data-bs-dismiss')).toBe('modal');

    button!.click();
    expect(openOnboardingGuideMock).toHaveBeenCalledTimes(1);
  });
});
