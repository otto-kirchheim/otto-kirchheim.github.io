import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { planeFeature } from '../scripts/new-feature';

const manifest = readFileSync('src/ts/app/features.ts', 'utf8');

describe('scripts/new-feature (planeFeature)', () => {
  it('plant Ordner, Tab, ui- und help-Teil, Test und Manifest-Eintrag', () => {
    const plan = planeFeature({ slug: 'demo', label: 'Demo-Feature' }, manifest);

    expect(plan.dateien.map(datei => datei.pfad)).toEqual([
      'src/ts/features/Demo/meta.ts',
      'src/ts/features/Demo/DemoTab.tsx',
      'src/ts/features/Demo/parts/ui.tsx',
      'src/ts/features/Demo/parts/help.ts',
      'test/Demo.test.ts',
    ]);
    const meta = plan.dateien[0].inhalt;
    expect(meta).toContain("id: 'demo'");
    expect(meta).toContain("label: 'Demo-Feature'");
    expect(meta).toContain('order: 5');
    expect(meta).toContain("rootId: 'demo-root'");
    expect(meta).toContain("helpKeys: ['tab.demo']");
  });

  it('haengt Import und define-Aufruf an das Manifest, ohne Bestehendes zu veraendern', () => {
    const { manifest: neu } = planeFeature({ slug: 'demo' }, manifest);

    expect(neu).toContain("import { demoMeta } from '@/features/Demo/meta';");
    expect(neu).toContain("ui: () => import('@/features/Demo/parts/ui'),");
    expect(neu).toContain("help: () => import('@/features/Demo/parts/help'),");
    expect(neu.match(/^featureRegistry\.define\(/gm)?.length).toBe(5);
    // Imports bleiben vor den define-Aufrufen.
    expect(neu.indexOf('import { demoMeta }')).toBeLessThan(neu.indexOf('\nfeatureRegistry.define('));
    expect(
      neu.replace("import { demoMeta } from '@/features/Demo/meta';\n", '').startsWith(manifest.slice(0, 200)),
    ).toBe(true);
  });

  it('lehnt ungueltige Slugs und bereits vorhandene Features ab', () => {
    expect(() => planeFeature({ slug: 'Demo' }, manifest)).toThrow('Ungültiger Slug');
    expect(() => planeFeature({ slug: '1demo' }, manifest)).toThrow('Ungültiger Slug');
    expect(() => planeFeature({ slug: 'ea' }, manifest)).toThrow('steht schon im Manifest');
    expect(() => planeFeature({ slug: 'neu', ordner: 'EA' }, manifest)).toThrow('steht schon im Manifest');
  });
});
