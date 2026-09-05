import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';
import { render } from '../../reactRender';

const { showModalMock, createSnackBarMock, issueVerificationLinkMock, issuePasswordResetLinkMock, writeTextMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  issueVerificationLinkMock: vi.fn(),
  issuePasswordResetLinkMock: vi.fn(),
  writeTextMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyModalHeader: (props: { title: string }) => h('div', { className: 'modal-header-stub' }, props.title),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/features/Admin/utils/api', () => ({
  issueVerificationLink: issueVerificationLinkMock,
  issuePasswordResetLink: issuePasswordResetLinkMock,
}));

// `LINK_CONFIG` im SUT kopiert `issueVerificationLink`/`issuePasswordResetLink` in ein Objekt-
// Property BEIM MODUL-LOAD (nicht erst beim Aufruf) -- ein statischer Import würde vor den
// vi.mock()-Aufrufen gehoistet und damit die echten, ungemockten Funktionen einfangen.
const { default: createAdminUserLinksModal } = await import('@/features/Admin/components/createAdminUserLinksModal');

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise(resolve => setTimeout(resolve, 0));
}

function renderModal(userId = 'u1', userName = 'Max Mustermann', emailVerified = false): HTMLDivElement {
  createAdminUserLinksModal(userId, userName, emailVerified);
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(showModalMock.mock.calls[showModalMock.mock.calls.length - 1][0], container);
  return container;
}

describe('createAdminUserLinksModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  it('zeigt beide Link-Abschnitte mit Überschrift/Beschreibung/Gültigkeit', () => {
    const container = renderModal();
    expect(container.textContent).toContain('Verifizierungs-Link');
    expect(container.textContent).toContain('48 Stunden');
    expect(container.textContent).toContain('Passwort-Reset-Link');
    expect(container.textContent).toContain('2 Stunden');
  });

  it('zeigt einen Hinweis statt Button, wenn E-Mail bereits verifiziert ist', () => {
    const container = renderModal('u1', 'Max', true);
    const sections = container.querySelectorAll('.border.rounded');
    expect(sections[0].textContent).toContain('bereits verifiziert');
    expect(sections[0].querySelector('button')).toBeNull();
    expect(sections[1].querySelector('button')).not.toBeNull();
  });

  it('zeigt einen Ladeindikator, während der Link erzeugt wird', async () => {
    issueVerificationLinkMock.mockReturnValue(new Promise(() => {}));
    const container = renderModal();

    const button = container.querySelectorAll('button')[0] as HTMLButtonElement;
    button.click();
    await flush(1);

    expect(container.textContent).toContain('Erzeugen…');
  });

  it('erzeugt einen Link und zeigt ihn nach dem Laden an', async () => {
    issueVerificationLinkMock.mockResolvedValue({
      url: 'https://x/verify/tok',
      expiresAt: '2025-01-01',
      mailSent: true,
    });
    const container = renderModal();

    const button = container.querySelectorAll('button')[0] as HTMLButtonElement;
    button.click();
    await flush();

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('https://x/verify/tok');
    expect(container.querySelector('.text-warning-emphasis')).toBeNull();
  });

  it('zeigt einen Hinweis, wenn der Mailversand fehlgeschlagen ist', async () => {
    issueVerificationLinkMock.mockResolvedValue({
      url: 'https://x/verify/tok',
      expiresAt: '2025-01-01',
      mailSent: false,
    });
    const container = renderModal();

    (container.querySelectorAll('button')[0] as HTMLButtonElement).click();
    await flush();
    await flush();

    expect(container.textContent).toContain('E-Mail-Versand fehlgeschlagen');
  });

  it('zeigt eine Fehlermeldung, wenn das Erzeugen fehlschlägt', async () => {
    issueVerificationLinkMock.mockRejectedValue(new Error('Server nicht erreichbar'));
    const container = renderModal();

    (container.querySelectorAll('button')[0] as HTMLButtonElement).click();
    await flush();
    await flush();

    expect(container.querySelector('.text-danger')?.textContent).toBe('Server nicht erreichbar');
  });

  it('kopiert den reinen Link und zeigt eine Erfolgsmeldung', async () => {
    issueVerificationLinkMock.mockResolvedValue({
      url: 'https://x/verify/tok',
      expiresAt: '2025-01-01',
      mailSent: true,
    });
    writeTextMock.mockResolvedValue(undefined);
    const container = renderModal();
    (container.querySelectorAll('button')[0] as HTMLButtonElement).click();
    await flush();
    await flush();

    const copyLinkButton = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Link kopieren'),
    ) as HTMLButtonElement;
    copyLinkButton.click();
    await flush();

    expect(writeTextMock).toHaveBeenCalledWith('https://x/verify/tok');
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Link kopiert', status: 'success' }),
    );
  });

  it('kopiert den formatierten Text mit Begrüßung und Gültigkeit', async () => {
    issuePasswordResetLinkMock.mockResolvedValue({
      url: 'https://x/reset/tok',
      expiresAt: '2025-01-01',
      mailSent: true,
    });
    writeTextMock.mockResolvedValue(undefined);
    const container = renderModal('u1', 'Erika Musterfrau');
    const resetButton = container.querySelectorAll('.border.rounded')[1].querySelector('button') as HTMLButtonElement;
    resetButton.click();
    await flush();
    await flush();

    const copyTextButton = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Text kopieren'),
    ) as HTMLButtonElement;
    copyTextButton.click();
    await flush();

    const copiedText = writeTextMock.mock.calls[0][0] as string;
    expect(copiedText).toContain('Hallo Erika Musterfrau,');
    expect(copiedText).toContain('https://x/reset/tok');
    expect(copiedText).toContain('2 Stunden gültig');
  });

  it('zeigt einen Fehler-Snackbar, wenn das Kopieren fehlschlägt', async () => {
    issueVerificationLinkMock.mockResolvedValue({
      url: 'https://x/verify/tok',
      expiresAt: '2025-01-01',
      mailSent: true,
    });
    writeTextMock.mockRejectedValue(new Error('denied'));
    const container = renderModal();
    (container.querySelectorAll('button')[0] as HTMLButtonElement).click();
    await flush();
    await flush();

    const copyLinkButton = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Link kopieren'),
    ) as HTMLButtonElement;
    copyLinkButton.click();
    await flush();

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('rendert einen Schließen-Button im Footer', () => {
    const container = renderModal();
    const closeButton = container.querySelector('[data-bs-dismiss="modal"]');
    expect(closeButton?.textContent).toBe('Schließen');
  });
});
