import { describe, expect, it } from 'bun:test';
import { getPasswordStrength } from '@/infrastructure/validation/passwordStrength';

describe('passwordStrength', () => {
  describe('getPasswordStrength', () => {
    it('bewertet ein leeres Passwort als zu schwach', () => {
      expect(getPasswordStrength('')).toBe('tooWeak');
    });

    it('bewertet nur Kleinbuchstaben (kurz) als zu schwach', () => {
      expect(getPasswordStrength('abc')).toBe('tooWeak');
    });

    it('bewertet Kleinbuchstaben mit Mindestlaenge als schwach', () => {
      expect(getPasswordStrength('abcdefgh')).toBe('weak');
    });

    it('bewertet Klein-/Großbuchstaben mit Mindestlaenge als mittel', () => {
      expect(getPasswordStrength('Abcdefgh')).toBe('medium');
    });

    it('bewertet Klein-/Großbuchstaben + Zahl mit Mindestlaenge als stark', () => {
      expect(getPasswordStrength('Abcdefg1')).toBe('strong');
    });

    it('bewertet alle 5 Regeln erfuellt als stark', () => {
      expect(getPasswordStrength('Abcdefg1!')).toBe('strong');
    });
  });
});
