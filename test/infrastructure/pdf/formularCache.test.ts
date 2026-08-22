import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: vi.fn() }));

import Storage from '@/infrastructure/storage/Storage';
import { cacheVersion, cacheVorlage, getCachedVersion, getCachedVorlage } from '@/infrastructure/pdf/formularCache';

const gueltigeVersion = {
  version: 'v1',
  gueltigVon: '2026-01-01',
  gueltigBis: null,
  layout: { template: '/api/v2/vorlagen/abc123', seiten: [{ quelle: 0, bereiche: [], felder: {} }] },
  tabellen: {},
} as unknown as Parameters<typeof cacheVersion>[2];

function machDatei(inhalt: string, name = 'test.pdf'): File {
  return new File([inhalt], name, { type: 'application/pdf' });
}

describe('formularCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Version-Cache', () => {
    it('speichert und liest eine Version für formular+stichtag', () => {
      cacheVersion('ea', '2026-04-01', gueltigeVersion);

      expect(getCachedVersion('ea', '2026-04-01')).toEqual(gueltigeVersion);
    });

    it('liefert undefined für einen nicht vorhandenen Schlüssel', () => {
      expect(getCachedVersion('ea', '2026-04-01')).toBeUndefined();
    });

    it('hält formular+stichtag-Kombinationen auseinander', () => {
      cacheVersion('ea', '2026-04-01', gueltigeVersion);

      expect(getCachedVersion('ea', '2026-05-01')).toBeUndefined();
      expect(getCachedVersion('ewt', '2026-04-01')).toBeUndefined();
    });

    it('behandelt einen strukturell kaputten Cache-Eintrag als Cache-Miss statt zu werfen', () => {
      Storage.set('formularVersionCache', { 'ea:2026-04-01': { version: { irgendwas: true }, timestamp: Date.now() } });

      expect(getCachedVersion('ea', '2026-04-01')).toBeUndefined();
    });
  });

  describe('Vorlagen-Cache', () => {
    it('speichert und liest eine Vorlage byte-genau über Base64 zurück', async () => {
      const original = machDatei('%PDF-1.4 kleiner-inhalt');

      await cacheVorlage('abc123', original);
      const gecacht = getCachedVorlage('abc123');

      expect(gecacht).toBeDefined();
      expect(await gecacht!.text()).toBe(await original.text());
      expect(gecacht!.type).toBe('application/pdf');
    });

    it('liefert undefined für eine nicht vorhandene vorlagenId', () => {
      expect(getCachedVorlage('fehlt')).toBeUndefined();
    });

    it('überschreibt einen bestehenden Eintrag nicht erneut (Inhalt ist content-addressed)', async () => {
      await cacheVorlage('abc123', machDatei('erste-version'));
      await cacheVorlage('abc123', machDatei('sollte-ignoriert-werden'));

      expect(await getCachedVorlage('abc123')!.text()).toBe('erste-version');
    });

    it('rundet auch einen Puffer über eine Chunk-Grenze hinweg (0x8000 Bytes) korrekt', async () => {
      const gross = 'x'.repeat(0x8000 + 123);
      await cacheVorlage('gross', machDatei(gross));

      expect(await getCachedVorlage('gross')!.text()).toBe(gross);
    });

    it('deckelt die Eintragszahl und entfernt den ältesten Eintrag (LRU)', async () => {
      for (let i = 0; i < 11; i++) {
        await cacheVorlage(`vorlage-${i}`, machDatei(`inhalt-${i}`));
        // Sicherstellen, dass die Timestamps strikt aufsteigend sind (sonst evict-Reihenfolge unklar).
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      expect(getCachedVorlage('vorlage-0')).toBeUndefined();
      expect(getCachedVorlage('vorlage-10')).toBeDefined();
    });

    it('behandelt einen kaputten Base64-Eintrag als Cache-Miss statt zu werfen', () => {
      Storage.set('vorlagenPdfCache', { abc123: { base64: '!!!nicht-base64!!!', timestamp: Date.now() } });

      expect(getCachedVorlage('abc123')).toBeUndefined();
    });
  });
});
