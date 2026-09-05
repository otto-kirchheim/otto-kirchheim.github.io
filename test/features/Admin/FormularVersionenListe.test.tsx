import { describe, expect, it, mock } from 'bun:test';
import { render } from '../../reactRender';

import { FormularVersionenListe } from '@/features/Admin/components/FormularVersionenListe';
import type { VersionUebersicht } from '@/features/Admin/components/formularVersionenApi';

function version(overrides: Partial<VersionUebersicht> = {}): VersionUebersicht {
  return {
    id: 'v1',
    version: '1',
    gueltigVon: '2025-01-01',
    gueltigBis: '2025-12-31',
    vorlageId: 'vor-1',
    konfig: {} as VersionUebersicht['konfig'],
    tabellen: {} as VersionUebersicht['tabellen'],
    ...overrides,
  };
}

function renderListe(props: Parameters<typeof FormularVersionenListe>[0]): HTMLDivElement {
  const container = document.createElement('div');
  render(<FormularVersionenListe {...props} />, container);
  return container;
}

describe('FormularVersionenListe', () => {
  it('zeigt einen Ladehinweis, solange laedt=true ist', () => {
    const container = renderListe({
      versionen: [],
      bearbeiteId: null,
      laedt: true,
      onBearbeiten: mock(),
      onLoeschen: mock(),
    });
    expect(container.textContent).toContain('Versionen werden geladen');
    expect(container.querySelector('table')).toBeNull();
  });

  it('zeigt einen Leer-Hinweis, wenn es noch keine Version gibt', () => {
    const container = renderListe({
      versionen: [],
      bearbeiteId: null,
      laedt: false,
      onBearbeiten: mock(),
      onLoeschen: mock(),
    });
    expect(container.textContent).toContain('noch keine Version');
  });

  it('rendert eine Tabellenzeile pro Version', () => {
    const container = renderListe({
      versionen: [version({ id: 'v1', version: '1' }), version({ id: 'v2', version: '2', gueltigBis: null })],
      bearbeiteId: null,
      laedt: false,
      onBearbeiten: mock(),
      onLoeschen: mock(),
    });

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('offen');
  });

  it('markiert die aktuell bearbeitete Zeile', () => {
    const container = renderListe({
      versionen: [version({ id: 'v1' })],
      bearbeiteId: 'v1',
      laedt: false,
      onBearbeiten: mock(),
      onLoeschen: mock(),
    });

    expect(container.querySelector('tbody tr')?.className).toContain('table-active');
  });

  it('ruft onBearbeiten/onLoeschen mit der jeweiligen Version auf', () => {
    const onBearbeiten = mock();
    const onLoeschen = mock();
    const v = version({ id: 'v1' });
    const container = renderListe({ versionen: [v], bearbeiteId: null, laedt: false, onBearbeiten, onLoeschen });

    (container.querySelector('.btn-outline-secondary') as HTMLButtonElement).click();
    (container.querySelector('.btn-outline-danger') as HTMLButtonElement).click();

    expect(onBearbeiten).toHaveBeenCalledWith(v);
    expect(onLoeschen).toHaveBeenCalledWith(v);
  });
});
