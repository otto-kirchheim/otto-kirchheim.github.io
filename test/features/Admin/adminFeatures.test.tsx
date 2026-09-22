import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

const { fetchAdminResourceMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  fetchAdminResourceMock: vi.fn(),
}));

vi.mock('@/features/Admin/utils/api', () => ({
  fetchAdminResource: fetchAdminResourceMock,
  fetchAdminResourceById: vi.fn(),
  fetchAdminResourceYears: vi.fn(async () => []),
  updateAdminDoc: vi.fn(),
  deleteAdminDoc: vi.fn(),
  fetchAdminUserNameMap: vi.fn(async () => ({})),
}));

import '@/app/features';
import { featureRegistry } from '@/shared/lib/feature';
import type { FeatureDefinition } from '@/shared/lib/feature';
import {
  adminCrossRef,
  adminFieldEnum,
  adminResourceByEndpoint,
  adminResources,
  adminSchemaFields,
  getAdminFeaturesState,
  ladeAdminFeatures,
  resetAdminFeatures,
} from '@/features/Admin/adminFeatures';
import { AdminResourceBrowser } from '@/features/Admin/components/AdminResourceBrowser';
import { render } from '@test/reactRender';

const definitions = () => (featureRegistry as unknown as { definitions: Map<string, FeatureDefinition> }).definitions;

describe('Admin nach Features', () => {
  beforeEach(() => {
    resetAdminFeatures();
    fetchAdminResourceMock.mockResolvedValue({ data: [], total: 0, limit: 25, skip: 0 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('laedt die Admin-Anteile aller Features gleichzeitig in meta.order mit den bisherigen Ressourcen', async () => {
    const state = await ladeAdminFeatures();

    expect(state.features.map(f => f.id)).toEqual(['ber', 'ewt', 'ez', 'ea']);
    expect(state.fehler).toEqual([]);
    expect(adminResources().map(r => r.endpoint)).toEqual([
      'bereitschaftseinsaetze',
      'bereitschaftszeitraeume',
      'einsatzwechseltaetigkeiten',
      'nebengeld',
      'entgeltausgleich',
    ]);
    expect(adminResources().map(r => r.shortLabel)).toEqual(['BE', 'BZ', 'EWT', 'NG', 'EA']);
    expect(adminSchemaFields('nebengeld')).toContain('Zulagen');
    expect(adminFieldEnum('Schicht')).toEqual(['T', 'SP', 'N', 'S', 'BN']);
    expect(adminCrossRef('EWT')).toEqual({ endpoint: 'einsatzwechseltaetigkeiten' });
    expect(adminCrossRef('Bereitschaftszeitraum')).toEqual({ endpoint: 'bereitschaftszeitraeume', isArray: true });
    expect(
      state.features
        .flatMap(f => (f.formular ? [f.formular] : []))
        .sort((a, b) => a.order - b.order)
        .map(f => f.code),
    ).toEqual(['ez', 'ewt', 'bereitschaft', 'ea']);
  });

  it('Chunk-Fehler: ein fehlgeschlagener Admin-Ordner blockiert die anderen nicht, der Fehler wird nicht gemerkt', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let versuche = 0;
    const manifest = {
      ber: async () => ({ default: { id: 'ber', resources: [], statsRows: [] } }),
      ewt: async () => {
        versuche++;
        if (versuche === 1) throw new Error('Chunk fehlt');
        return { default: { id: 'ewt', resources: [], statsRows: [] } };
      },
    };

    const erster = await ladeAdminFeatures(manifest);
    expect(erster.features.map(f => f.id)).toEqual(['ber']);
    expect(erster.fehler).toEqual(['ewt']);
    expect(errorSpy).toHaveBeenCalled();

    const zweiter = await ladeAdminFeatures(manifest);
    expect(zweiter.features.map(f => f.id)).toEqual(['ber', 'ewt']);
    expect(zweiter.fehler).toEqual([]);
    vi.restoreAllMocks();
  });

  it('Entfernbarkeit: ohne das EWT-Feature fehlen dessen Ressource und der Verweis darauf, die uebrigen bleiben', async () => {
    const ewt = definitions().get('ewt')!;
    definitions().delete('ewt');
    try {
      await ladeAdminFeatures();
      expect(getAdminFeaturesState().features.map(f => f.id)).toEqual(['ber', 'ez', 'ea']);
      expect(adminResourceByEndpoint('einsatzwechseltaetigkeiten')).toBeUndefined();
      // Das Feld `EWT` in Nebengeld/EA hat kein Ziel mehr: der Link entfaellt.
      expect(adminCrossRef('EWT')).toBeUndefined();
      expect(adminCrossRef('Bereitschaftszeitraum')).toBeDefined();
    } finally {
      definitions().set('ewt', ewt);
    }
  });

  it('Ressourcenbrowser rendert die Tabs aus den Admin-Anteilen (bisherige Reihenfolge)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<AdminResourceBrowser />, container);

    // Erst nach dem Laden erscheinen die Tabs (asynchrone Admin-Ordner).
    await new Promise(resolve => setTimeout(resolve, 50));

    const tabs = [...container.querySelectorAll('[role="tab"]')].map(tab => tab.textContent);
    expect(tabs.map(text => text?.replace(/\s+/g, ''))).toEqual([
      'BereitschaftseinsatzBE',
      'BereitschaftszeitraumBZ',
      'EinsatzwechseltätigkeitEWT',
      'NebengeldNG',
      'EntgeltausgleichEA',
    ]);
    render(null, container);
  });
});
