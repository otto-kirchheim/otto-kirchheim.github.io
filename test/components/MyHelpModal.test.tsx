import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from '@test/reactRender';

const openOnboardingGuideMock = vi.fn();
vi.mock('@/core/orchestration/onboarding/createOnboardingGuideModal', () => ({
  openOnboardingGuide: openOnboardingGuideMock,
}));

// MyHelpModal's Reopen-Button traegt data-dialog-dismiss="modal". Der reale Bootstrap-Modal-Import
// registriert einen document-weiten Click-Handler, der ohne echtes .modal-Element crasht.
// Fuer diesen isolierten Komponententest wird das Modul daher wie in MyShowFooter.test.tsx gemockt.

import '@/app/features';
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

  it('does not render a reopen-onboarding action for regular contexts', async () => {
    const container = renderMyHelpModal((await getHelpContent('tab.ewt'))!);

    expect(container.textContent).not.toContain('Ersteinrichtung erneut öffnen');
  });

  it('renders and wires the reopen-onboarding action for the start context', async () => {
    const container = renderMyHelpModal((await getHelpContent('tab.start'))!);

    const button = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Ersteinrichtung erneut öffnen'),
    );
    expect(button).not.toBeUndefined();
    expect(button?.getAttribute('data-dialog-dismiss')).toBe('modal');

    button!.click();
    expect(openOnboardingGuideMock).toHaveBeenCalledTimes(1);
  });
});
