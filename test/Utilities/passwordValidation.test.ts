import { describe, expect, it } from 'bun:test';
import {
  getPasswordValidationMessage,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/infrastructure/validation/passwordValidation';

describe('passwordValidation', () => {
  describe('getPasswordValidationMessage', () => {
    it('gibt eine Fehlermeldung zurück wenn das Passwort zu kurz ist', () => {
      const message = getPasswordValidationMessage('kurz');
      expect(message).toBe(`Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`);
    });

    it('gibt eine Fehlermeldung zurück wenn das Passwort zu lang ist', () => {
      const tooLong = 'a'.repeat(PASSWORD_MAX_LENGTH + 1);
      const message = getPasswordValidationMessage(tooLong);
      expect(message).toBe(`Das Passwort darf maximal ${PASSWORD_MAX_LENGTH} Zeichen lang sein`);
    });

    it('gibt null zurück für ein gültiges Passwort', () => {
      expect(getPasswordValidationMessage('gueltiges-passwort-123')).toBeNull();
    });

    it('akzeptiert die exakte Mindestlänge', () => {
      const exact = 'a'.repeat(PASSWORD_MIN_LENGTH);
      expect(getPasswordValidationMessage(exact)).toBeNull();
    });

    it('akzeptiert die exakte Maximallänge', () => {
      const exact = 'a'.repeat(PASSWORD_MAX_LENGTH);
      expect(getPasswordValidationMessage(exact)).toBeNull();
    });

    it('lehnt ein leeres Passwort ab', () => {
      expect(getPasswordValidationMessage('')).toBe(
        `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`,
      );
    });

    it('verwendet ein benutzerdefiniertes subject in der Fehlermeldung (zu kurz)', () => {
      const message = getPasswordValidationMessage('abc', 'Das neue Passwort');
      expect(message).toBe(`Das neue Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`);
    });

    it('verwendet ein benutzerdefiniertes subject in der Fehlermeldung (zu lang)', () => {
      const tooLong = 'a'.repeat(PASSWORD_MAX_LENGTH + 5);
      const message = getPasswordValidationMessage(tooLong, 'Das neue Passwort');
      expect(message).toBe(`Das neue Passwort darf maximal ${PASSWORD_MAX_LENGTH} Zeichen lang sein`);
    });
  });
});
