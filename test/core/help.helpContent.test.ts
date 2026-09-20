import { describe, expect, it } from 'bun:test';
import { Glob } from 'bun';
import '@/app/features';
import { featureRegistry } from '@/core/hooks';
import { getHelpContent, type HelpContextKey } from '@/core/help/helpContent';

const FEATURE_KEYS: string[] = featureRegistry.metas().flatMap(meta => [...(meta.helpKeys ?? [])]);
const ALL_KEYS: HelpContextKey[] = ['tab.start', 'tab.einstellungen', ...FEATURE_KEYS];

describe('getHelpContent', () => {
  it.each(ALL_KEYS)('returns non-empty required sections for "%s"', async key => {
    const content = await getHelpContent(key);

    expect(content).toBeDefined();
    expect(content!.title.length).toBeGreaterThan(0);
    expect(content!.kurzbeschreibung.length).toBeGreaterThan(0);
    expect(content!.wasKannIchHierMachen.length).toBeGreaterThan(0);
    for (const item of content!.wasKannIchHierMachen) {
      expect(item.length).toBeGreaterThan(0);
    }
  });

  it('keeps buttons, felder, schritte and haeufigeFehler non-empty when defined', async () => {
    for (const key of ALL_KEYS) {
      const content = (await getHelpContent(key))!;

      if (content.buttons) expect(content.buttons.length).toBeGreaterThan(0);
      if (content.felder) expect(content.felder.length).toBeGreaterThan(0);
      if (content.schritte) expect(content.schritte.length).toBeGreaterThan(0);
      if (content.haeufigeFehler) expect(content.haeufigeFehler.length).toBeGreaterThan(0);
      if (content.tipp !== undefined) expect(content.tipp.length).toBeGreaterThan(0);
    }
  });

  it.each(ALL_KEYS.filter(key => key.startsWith('modal.')))(
    'describes concrete input fields instead of self-explanatory buttons for "%s"',
    async key => {
      const content = (await getHelpContent(key))!;

      expect(content.felder?.length ?? 0).toBeGreaterThan(0);
      expect(content.buttons).toBeUndefined();
    },
  );

  it('liefert undefined fuer unbekannte Schluessel', async () => {
    expect(await getHelpContent('tab.gibtEsNicht')).toBeUndefined();
  });
});

describe('Hilfe-Vertrag der Features', () => {
  it.each(featureRegistry.metas().map(meta => meta.id))(
    'meta.helpKeys und Teil help von "%s" nennen dieselben Schluessel',
    async id => {
      const meta = featureRegistry.meta(id)!;
      const help = await featureRegistry.load(id, 'help');

      expect(Object.keys(help).sort()).toEqual([...(meta.helpKeys ?? [])].sort());
      expect(meta.helpKeys).toContain(`tab.${meta.legacy.tabKey}`);
    },
  );

  it('hat keinen Schluessel doppelt (auch nicht gegenueber den Kern-Kontexten)', () => {
    const alle = ['tab.start', 'tab.einstellungen', ...FEATURE_KEYS];
    expect(new Set(alle).size).toBe(alle.length);
  });

  it('loest jeden im Quellcode verwendeten Hilfe-Schluessel auf', async () => {
    const verwendet = new Set<string>();
    for await (const datei of new Glob('src/ts/**/*.{ts,tsx}').scan('.')) {
      const text = await Bun.file(datei).text();
      for (const treffer of text.matchAll(/(?:helpContext=|openHelpModal\()\{?\s*'([a-zA-Z.]+)'/g))
        verwendet.add(treffer[1]);
      for (const treffer of text.matchAll(/helpContext=\{[^}]*\?\s*'([a-zA-Z.]+)'\s*:\s*'([a-zA-Z.]+)'/g)) {
        verwendet.add(treffer[1]);
        verwendet.add(treffer[2]);
      }
    }

    expect(verwendet.size).toBeGreaterThan(10);
    for (const key of verwendet) expect(await getHelpContent(key), key).toBeDefined();
  });
});
