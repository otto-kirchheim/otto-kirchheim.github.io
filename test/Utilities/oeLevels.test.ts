import { describe, expect, it } from 'bun:test';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';

describe('oeLevels', () => {
  describe('splitOeInput', () => {
    it('zerlegt an Punkt, Bindestrich, Schrägstrich und Leerzeichen', () => {
      expect(splitOeInput('V.IW-MI/M-KSL-IL 03')).toEqual(['V', 'IW', 'MI', 'M', 'KSL', 'IL', '03']);
    });

    it('behält die Schreibweise der Eingabe', () => {
      expect(splitOeInput('v.iw-mi')).toEqual(['v', 'iw', 'mi']);
    });

    it('liefert ein leeres Array ohne verwertbaren Inhalt', () => {
      expect(splitOeInput('')).toEqual([]);
      expect(splitOeInput('  . - ')).toEqual([]);
    });
  });

  describe('joinOeLevels', () => {
    it('verbindet die ersten beiden Ebenen mit Punkt, weitere mit Bindestrich', () => {
      expect(joinOeLevels(['V', 'IW', 'MI', 'M', 'KSL', 'IL'])).toBe('V.IW-MI-M-KSL-IL');
    });

    it('hängt eine rein numerische letzte Ebene mit Leerzeichen an', () => {
      expect(joinOeLevels(['V', 'IW', 'MI', 'M', 'KSL', 'IL', '03'])).toBe('V.IW-MI-M-KSL-IL 03');
    });

    it('gibt einzelne und doppelte Ebenen korrekt aus', () => {
      expect(joinOeLevels(['V'])).toBe('V');
      expect(joinOeLevels(['V', 'IW'])).toBe('V.IW');
    });

    it('liefert einen leeren String ohne Ebenen', () => {
      expect(joinOeLevels([])).toBe('');
      expect(joinOeLevels(['', '  '])).toBe('');
    });
  });

  // Das Anzeigeformat muss zur Backend-Darstellung passen, sonst zeigt die
  // Vorschau der Massenänderung andere Werte als die gespeicherten.
  it('ist über Split und Join hinweg stabil', () => {
    const display = 'V.IW-MI-M-KSL-IL 03';
    expect(joinOeLevels(splitOeInput(display))).toBe(display);
  });
});
