import { describe, expect, it, vi } from 'bun:test';
import { setzeSignaturPng, skaliereFuerDisplay } from '@/infrastructure/pdf/signaturePad';
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
