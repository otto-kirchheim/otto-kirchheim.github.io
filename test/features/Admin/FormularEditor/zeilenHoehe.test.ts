import { describe, expect, it } from 'bun:test';
import { zeilenHoeheAus } from '@/features/Admin/components/FormularEditor/FormularEditor';

describe('zeilenHoeheAus', () => {
  it('mittelt über alle Zeilen statt über eine einzelne Messung', () => {
    // 12 Zeilen, erste Grundlinie 700, letzte 480 -> 11 Abstände à 20pt.
    expect(zeilenHoeheAus(700, 480, 12)).toBe(20);
  });

  it('rundet auf zwei Nachkommastellen, statt auf ganze Punkte zu zwingen', () => {
    // Nicht-ganzzahlige Zeilenhöhen sind der Normalfall bei aus xlsx exportierten Vorlagen.
    expect(zeilenHoeheAus(700, 481, 12)).toBe(19.91);
  });

  it('die Mittelung entschärft eine ungenaue Einzelmessung -- der Kern des Fehlerbildes', () => {
    // Freihändig über EINE Zeile gezogen: 20,5 statt 20,0. Nach 11 Zeilen sind das 5,5pt Versatz.
    const einzelmessung = 20.5;
    const gemittelt = zeilenHoeheAus(700, 480, 12)!;
    expect(Math.abs(einzelmessung * 11 - 220)).toBeCloseTo(5.5, 5);
    expect(Math.abs(gemittelt * 11 - 220)).toBe(0);
  });

  it('liefert null bei nur einer Zeile -- ohne zweite Zeile gibt es keinen Abstand', () => {
    expect(zeilenHoeheAus(700, 680, 1)).toBeNull();
  });

  it('liefert null, wenn die "letzte" Zeile über der ersten liegt (vertauscht markiert)', () => {
    expect(zeilenHoeheAus(480, 700, 12)).toBeNull();
    expect(zeilenHoeheAus(700, 700, 12)).toBeNull();
  });
});
