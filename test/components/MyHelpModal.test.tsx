import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from 'preact';

const openOnboardingGuideMock = vi.fn();
vi.mock('@/core/orchestration/onboarding/createOnboardingGuideModal', () => ({
  openOnboardingGuide: openOnboardingGuideMock,
}));

import MyHelpModal from '@/components/MyHelpModal';
import { getHelpContent } from '@/core/help/helpContent';

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
