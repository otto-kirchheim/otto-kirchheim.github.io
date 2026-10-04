import { describe, expect, it, vi } from 'bun:test';
import { setzeSignaturPng, skaliereFuerDisplay, strichbreiten } from '@/shared/lib/pdf/signaturePad';
import type SignaturePad from 'signature_pad';

describe('skaliereFuerDisplay', () => {
  it('skaliert Anzeigegröße mit dem devicePixelRatio hoch', () => {
    expect(skaliereFuerDisplay({ breite: 300, hoehe: 100 }, 2)).toEqual({ breite: 600, hoehe: 200 });
  });

  it('rundet auf ganze Pixel', () => {
    expect(skaliereFuerDisplay({ breite: 301, hoehe: 101 }, 1.5)).toEqual({ breite: 452, hoehe: 152 });
  });

  it('nutzt mindestens Faktor 1, auch bei ratio < 1 oder 0', () => {
    expect(skaliereFuerDisplay({ breite: 300, hoehe: 100 }, 0.5)).toEqual({ breite: 300, hoehe: 100 });
    expect(skaliereFuerDisplay({ breite: 300, hoehe: 100 }, 0)).toEqual({ breite: 300, hoehe: 100 });
  });
});

describe('setzeSignaturPng', () => {
  it('reicht die Data-URL an pad.fromDataURL() durch', async () => {
    const fromDataURL = vi.fn().mockResolvedValue(undefined);
    const pad = { fromDataURL } as unknown as SignaturePad;

    await setzeSignaturPng(pad, 'data:image/png;base64,abc');

    expect(fromDataURL).toHaveBeenCalledWith('data:image/png;base64,abc');
  });
});

describe('strichbreiten', () => {
  it('waechst proportional zur Canvas-Breite, damit die Linie im PDF immer gleich dick ankommt', () => {
    const klein = strichbreiten(350);
    const gross = strichbreiten(700);

    expect(gross.minWidth / klein.minWidth).toBeCloseTo(2, 5);
    expect(gross.maxWidth / klein.maxWidth).toBeCloseTo(2, 5);
  });

  it('liefert im PDF (Flaeche 140pt breit) etwa die Zielstaerken von 0.8 bis 2 pt', () => {
    const canvasBreite = 420; // 3 px je pt
    const { minWidth, maxWidth } = strichbreiten(canvasBreite);

    expect(minWidth / 3).toBeCloseTo(0.8, 5);
    expect(maxWidth / 3).toBeCloseTo(2, 5);
  });

  it('haelt maxWidth ueber minWidth und bleibt bei Breite 0 endlich', () => {
    const { minWidth, maxWidth } = strichbreiten(0);

    expect(Number.isFinite(minWidth)).toBe(true);
    expect(maxWidth).toBeGreaterThan(minWidth);
  });
});
