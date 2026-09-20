import { beforeEach, describe, expect, it, vi } from 'bun:test';

const warmeVorlagenCache = vi.fn<(formular: string, stichtag: string) => Promise<void>>(() => Promise.resolve());

vi.mock('@/infrastructure/pdf/ladeFormular', () => ({ warmeVorlagenCache }));

import '@/app/features';
import { warmeFormularCaches } from '@/infrastructure/pdf/warmeFormularCaches';

/** `warmeFormularCaches` plant die Arbeit per `requestIdleCallback`/`setTimeout` -- eine Runde
 * Makro-Task abwarten, danach sind alle `warmeVorlagenCache`-Aufrufe abgesetzt. */
const flush = () => new Promise(resolve => setTimeout(resolve, 5));

describe('#warmeFormularCaches', () => {
  beforeEach(() => {
    warmeVorlagenCache.mockClear();
    // deterministisch den setTimeout-Pfad nehmen
    (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback = undefined;
  });

  it('mappt aktivierteTabs auf FormularCodes (neben -> ez) und nutzt den Monatsersten als Stichtag', async () => {
    warmeFormularCaches(['ewt', 'ea', 'neben'], 3, 2026);
    await flush();

    const formulare = warmeVorlagenCache.mock.calls.map(([f]) => f);
    expect(formulare.sort()).toEqual(['ea', 'ewt', 'ez']);
    for (const [, stichtag] of warmeVorlagenCache.mock.calls) expect(stichtag).toBe('2026-03-01');
  });

  it('faellt bei leerer Liste auf die Legacy-Standardtabs zurueck (bereitschaft, ewt, neben)', async () => {
    warmeFormularCaches([], 12, 2025);
    await flush();

    expect(warmeVorlagenCache.mock.calls.map(([f]) => f).sort()).toEqual(['bereitschaft', 'ewt', 'ez']);
  });

  it('dedupliziert und ignoriert unbekannte Tab-Schluessel', async () => {
    warmeFormularCaches(['ewt', 'ewt', 'unsinn'], 1, 2026);
    await flush();

    expect(warmeVorlagenCache.mock.calls.map(([f]) => f)).toEqual(['ewt']);
  });

  it('macht nichts, wenn kein Tab auf ein Formular zeigt', async () => {
    warmeFormularCaches(['unsinn'], 1, 2026);
    await flush();

    expect(warmeVorlagenCache).not.toHaveBeenCalled();
  });

  it('wirft nie -- ein Fehler im Warmlauf bricht die Kette nicht ab', async () => {
    warmeVorlagenCache.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    expect(() => warmeFormularCaches(['ewt', 'ea'], 5, 2026)).not.toThrow();
    await flush();

    expect(warmeVorlagenCache.mock.calls.map(([f]) => f)).toEqual(['ewt', 'ea']);
  });
});
