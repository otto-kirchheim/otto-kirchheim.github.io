import { describe, expect, it } from 'bun:test';
import { getHelpContent, type HelpContextKey } from '@/core/help/helpContent';

const ALL_KEYS: HelpContextKey[] = [
  'tab.start',
  'tab.bereitschaft',
  'tab.ewt',
  'tab.neben',
  'tab.einstellungen',
  'modal.bereitschaft.add',
  'modal.bereitschaftEintrag.add',
  'modal.bereitschaftEintrag.edit',
  'modal.bereitschaftEinsatz.add',
  'modal.bereitschaftEinsatzEintrag.add',
  'modal.bereitschaftEinsatzEintrag.edit',
  'modal.ewt.add',
  'modal.ewtEintrag.add',
  'modal.ewtEintrag.edit',
  'modal.neben.add',
  'modal.nebenEintrag.add',
  'modal.nebenEintrag.edit',
  'modal.einstellungen.ve',
];

describe('getHelpContent', () => {
  it.each(ALL_KEYS)('returns non-empty required sections for "%s"', key => {
    const content = getHelpContent(key);

    expect(content.title.length).toBeGreaterThan(0);
    expect(content.kurzbeschreibung.length).toBeGreaterThan(0);
    expect(content.wasKannIchHierMachen.length).toBeGreaterThan(0);
    for (const item of content.wasKannIchHierMachen) {
      expect(item.length).toBeGreaterThan(0);
    }
  });

  it('keeps buttons, felder, schritte and haeufigeFehler non-empty when defined', () => {
    for (const key of ALL_KEYS) {
      const content = getHelpContent(key);

      if (content.buttons) expect(content.buttons.length).toBeGreaterThan(0);
      if (content.felder) expect(content.felder.length).toBeGreaterThan(0);
      if (content.schritte) expect(content.schritte.length).toBeGreaterThan(0);
      if (content.haeufigeFehler) expect(content.haeufigeFehler.length).toBeGreaterThan(0);
      if (content.tipp !== undefined) expect(content.tipp.length).toBeGreaterThan(0);
    }
  });

  it.each(ALL_KEYS.filter(key => key.startsWith('modal.')))(
    'describes concrete input fields instead of self-explanatory buttons for "%s"',
    key => {
      const content = getHelpContent(key);

      expect(content.felder?.length ?? 0).toBeGreaterThan(0);
      expect(content.buttons).toBeUndefined();
    },
  );
});
