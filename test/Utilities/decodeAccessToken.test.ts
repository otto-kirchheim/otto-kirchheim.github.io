import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getUserCookie, isAdmin } from '../../src/ts/utilities/decodeAccessToken';

describe('decodeAccessToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getUserCookie', () => {
    it('gibt null zurück wenn nichts gespeichert ist', () => {
      expect(getUserCookie()).toBeNull();
    });

    it('liest User-Daten aus localStorage', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
      expect(getUserCookie()).toEqual({ userName: 'Max', role: 'member' });
    });

    it('gibt null zurück wenn nur Benutzer aber keine Rolle gespeichert ist', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      expect(getUserCookie()).toBeNull();
    });

    it('gibt null zurück wenn nur Rolle aber kein Benutzer gespeichert ist', () => {
      localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
      expect(getUserCookie()).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('gibt false zurück ohne gespeicherte Daten', () => {
      expect(isAdmin()).toBe(false);
    });

    it('gibt false zurück für member', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
      expect(isAdmin()).toBe(false);
    });

    it('gibt true zurück für team-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('team-admin'));
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für org-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('org-admin'));
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für super-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('super-admin'));
      expect(isAdmin()).toBe(true);
    });
  });
});
