import { describe, expect, it } from 'bun:test';
import { skaliereFuerDisplay } from '@/infrastructure/pdf/signaturePad';

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
