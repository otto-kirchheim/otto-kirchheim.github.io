import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render, setzeWert } from '../../reactRender';

const { fetchAdminLogsMock, fetchAdminUserNameMapMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  fetchAdminLogsMock: vi.fn(),
  fetchAdminUserNameMapMock: vi.fn(),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  fetchAdminLogs: fetchAdminLogsMock,
  fetchAdminUserNameMap: fetchAdminUserNameMapMock,
}));

import { AdminLogBrowser } from '@/features/Admin/components/AdminLogBrowser';

async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise(resolve => setTimeout(resolve, 0));
}

function renderBrowser(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<AdminLogBrowser />, container);
  return container;
}

function logEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'log-1',
    timestamp: '2025-06-10T12:00:00.000Z',
    action: 'update',
    adminId: 'admin-1',
    targetUserId: 'user-1',
    targetResourceId: 'res-1234567890',
    params: { payload: { field: 'value' } },
    ...overrides,
  };
}

describe('AdminLogBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAdminUserNameMapMock.mockResolvedValue({});
    fetchAdminLogsMock.mockResolvedValue({ data: [], total: 0, limit: 25, skip: 0 });
  });

  it('zeigt einen Spinner während des initialen Ladens', async () => {
    fetchAdminLogsMock.mockReturnValue(new Promise(() => {}));
    const container = renderBrowser();
    await flush(1);

    expect(container.querySelector('.spinner-border')).not.toBeNull();
  });

  it('zeigt "Keine Log-Einträge" bei leerem Ergebnis', async () => {
    const container = renderBrowser();
    await flush();

    expect(container.textContent).toContain('Keine Log-Einträge');
  });

  it('rendert eine Zeile je Log-Eintrag mit formatiertem Zeitstempel', async () => {
    fetchAdminLogsMock.mockResolvedValue({ data: [logEntry()], total: 1, limit: 25, skip: 0 });
    const container = renderBrowser();
    await flush();

    const row = container.querySelector('tbody tr');
    expect(row?.textContent).toContain('10.06.25, 14:00');
    expect(row?.textContent).toContain('update');
  });

  it('zeigt "—" für einen fehlenden Zeitstempel', async () => {
    fetchAdminLogsMock.mockResolvedValue({ data: [logEntry({ timestamp: null })], total: 1, limit: 25, skip: 0 });
    const container = renderBrowser();
    await flush();

    expect(container.querySelector('tbody tr')?.textContent).toContain('—');
  });

  it('zeigt den echten Namen aus der User-Map, sonst eine gekürzte ID', async () => {
    fetchAdminUserNameMapMock.mockResolvedValue({ 'admin-1': 'Max Mustermann' });
    fetchAdminLogsMock.mockResolvedValue({
      data: [logEntry({ adminId: 'admin-1', targetUserId: 'unbekannte-lange-id-12345' })],
      total: 1,
      limit: 25,
      skip: 0,
    });
    const container = renderBrowser();
    await flush();

    expect(container.textContent).toContain('Max Mustermann');
    expect(container.querySelector('code.text-muted')?.textContent).toBe('…id-12345');
  });

  it('zeigt eine gekürzte Ressourcen-ID', async () => {
    fetchAdminLogsMock.mockResolvedValue({
      data: [logEntry({ targetResourceId: 'sehr-lange-ressourcen-id' })],
      total: 1,
      limit: 25,
      skip: 0,
    });
    const container = renderBrowser();
    await flush();

    expect(container.textContent).toContain('…urcen-id');
  });

  it('zeigt einen Fehler, wenn das Laden fehlschlägt', async () => {
    fetchAdminLogsMock.mockRejectedValue(new Error('Server nicht erreichbar'));
    const container = renderBrowser();
    await flush();

    expect(container.querySelector('.alert-danger')?.textContent).toBe('Server nicht erreichbar');
  });

  it('klappt die Payload-Details auf und wieder zu', async () => {
    fetchAdminLogsMock.mockResolvedValue({ data: [logEntry()], total: 1, limit: 25, skip: 0 });
    const container = renderBrowser();
    await flush();

    expect(container.querySelectorAll('tbody tr').length).toBe(1);
    (container.querySelector('button[aria-label="Details anzeigen"]') as HTMLButtonElement).click();
    await flush();

    expect(container.querySelectorAll('tbody tr').length).toBe(2);
    expect(container.querySelector('pre')?.textContent).toContain('"field": "value"');

    (container.querySelector('button[aria-label="Details ausblenden"]') as HTMLButtonElement).click();
    await flush();

    expect(container.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('zeigt keinen Details-Button, wenn kein Payload vorhanden ist', async () => {
    fetchAdminLogsMock.mockResolvedValue({
      data: [logEntry({ params: {} })],
      total: 1,
      limit: 25,
      skip: 0,
    });
    const container = renderBrowser();
    await flush();

    expect(container.querySelector('button[aria-label]')).toBeNull();
  });

  it('sucht nach Aktion beim Klick auf "Suchen"', async () => {
    const container = renderBrowser();
    await flush();
    fetchAdminLogsMock.mockClear();

    const input = container.querySelector('input') as HTMLInputElement;
    setzeWert(input, 'delete');
    await flush();

    const searchButton = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Suchen');
    searchButton?.click();
    await flush();

    expect(fetchAdminLogsMock).toHaveBeenCalledWith({ page: 1, limit: 25, action: 'delete' });
  });

  it('sucht auch bei Enter im Filterfeld', async () => {
    const container = renderBrowser();
    await flush();
    fetchAdminLogsMock.mockClear();

    const input = container.querySelector('input') as HTMLInputElement;
    setzeWert(input, 'create');
    await flush();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();

    expect(fetchAdminLogsMock).toHaveBeenCalledWith({ page: 1, limit: 25, action: 'create' });
  });

  it('zeigt den Zurücksetzen-Button nur bei aktivem Filter und setzt ihn zurück', async () => {
    const container = renderBrowser();
    await flush();

    expect(Array.from(container.querySelectorAll('button')).some(b => b.textContent === 'Zurücksetzen')).toBe(false);

    const input = container.querySelector('input') as HTMLInputElement;
    setzeWert(input, 'update');
    await flush();

    const resetButton = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Zurücksetzen');
    expect(resetButton).toBeDefined();
    fetchAdminLogsMock.mockClear();
    resetButton?.click();
    await flush();

    expect(fetchAdminLogsMock).toHaveBeenCalledWith({ page: 1, limit: 25, action: undefined });
  });

  it('lädt die aktuelle Seite mit "Aktualisieren" neu', async () => {
    const container = renderBrowser();
    await flush();
    fetchAdminLogsMock.mockClear();

    const refreshButton = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Aktualisieren'),
    ) as HTMLButtonElement;
    refreshButton.click();
    await flush();

    expect(fetchAdminLogsMock).toHaveBeenCalledWith({ page: 1, limit: 25, action: undefined });
  });

  describe('Pagination', () => {
    it('zeigt keine Pagination bei nur einer Seite', async () => {
      fetchAdminLogsMock.mockResolvedValue({ data: [logEntry()], total: 1, limit: 25, skip: 0 });
      const container = renderBrowser();
      await flush();

      expect(container.querySelector('.knopfgruppe')).toBeNull();
    });

    it('zeigt Gesamt/Seite und navigiert vor/zurück', async () => {
      fetchAdminLogsMock.mockResolvedValue({ data: [logEntry()], total: 60, limit: 25, skip: 25 });
      const container = renderBrowser();
      await flush();

      expect(container.textContent).toContain('Gesamt: 60');
      expect(container.textContent).toContain('Seite 1/3');

      const [prevButton, nextButton] = Array.from(container.querySelectorAll('.knopfgruppe button'));
      expect((prevButton as HTMLButtonElement).disabled).toBe(true);
      expect((nextButton as HTMLButtonElement).disabled).toBe(false);

      fetchAdminLogsMock.mockClear();
      (nextButton as HTMLButtonElement).click();
      await flush();

      expect(fetchAdminLogsMock).toHaveBeenCalledWith({ page: 2, limit: 25, action: undefined });
    });
  });
});
