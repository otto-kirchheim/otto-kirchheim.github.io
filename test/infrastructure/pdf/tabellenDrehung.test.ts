import { describe, expect, it } from 'bun:test';
import type { Drehung } from '@otto-kirchheim/nebengeld-shared';
import { dreheTabellenZelle, entdrehePunkt } from '@/infrastructure/pdf/tabellenDrehung';

describe('dreheTabellenZelle', () => {
  const zelle: { x: number; x2: number; y: number; y2: number; drehung: Drehung } = {
    x: 50,
    x2: 150,
    y: 700,
    y2: 714,
    drehung: 0,
  };

  it('gibt die Zelle bei 0° unverändert zurück', () => {
    expect(dreheTabellenZelle(zelle, 0, 595, 842)).toBe(zelle);
  });

  it('dreht eine Zelle um 90° um den Seitenmittelpunkt und zählt die drehung mit', () => {
    expect(dreheTabellenZelle(zelle, 90, 842, 595)).toEqual({
      x: 128,
      x2: 142,
      y: 50,
      y2: 150,
      drehung: 90,
    });
  });

  it('addiert auf eine bestehende Zell-drehung und läuft bei 360° auf 0', () => {
    const ergebnis = dreheTabellenZelle({ x: 10, x2: 20, y: 30, y2: 40, drehung: 270 as Drehung }, 90, 842, 595);
    expect(ergebnis.drehung).toBe(0);
  });

  it('behält bei 180° die Seitenmaße und dreht Punkt-Spiegelung', () => {
    expect(dreheTabellenZelle(zelle, 180, 595, 842)).toEqual({
      x: 445,
      x2: 545,
      y: 128,
      y2: 142,
      drehung: 180,
    });
  });
});

describe('entdrehePunkt (Umkehrung für den Editor-Drag)', () => {
  it('macht dreheTabellenZelle für jeden Winkel rückgängig', () => {
    const [w, h] = [842, 595];
    for (const grad of [90, 180, 270] as const) {
      const gedreht = dreheTabellenZelle({ x: 50, x2: 150, y: 700, y2: 714 }, grad, w, h);
      const [x, y] = entdrehePunkt(gedreht.x, gedreht.y, grad, w, h);
      const [x2, y2] = entdrehePunkt(gedreht.x2, gedreht.y2, grad, w, h);
      expect([Math.min(x, x2), Math.max(x, x2)]).toEqual([50, 150]);
      expect([Math.min(y, y2), Math.max(y, y2)]).toEqual([700, 714]);
    }
  });
});
