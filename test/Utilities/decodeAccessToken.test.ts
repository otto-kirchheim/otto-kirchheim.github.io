import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Role } from '@otto-kirchheim/nebengeld-shared';
import { getUserCookie, isAdmin } from '@/infrastructure/tokenManagement/decodeAccessToken';

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

    it('gibt null zurück wenn Benutzer/Rolle ohne Session-Token gespeichert sind', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
      expect(getUserCookie()).toBeNull();
    });

    it('liest User-Daten aus localStorage mit vorhandenem Session-Token', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(getUserCookie()).toEqual({ userName: 'Max', role: Role.MEMBER });
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
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(isAdmin()).toBe(false);
    });

    it('gibt true zurück für team-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('team-admin'));
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für org-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('org-admin'));
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für super-admin', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('super-admin'));
      localStorage.setItem('RefreshToken', JSON.stringify('refresh-token'));
      expect(isAdmin()).toBe(true);
    });

    it('gibt false zurück für eine unbekannte Rolle', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('guest'));
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(isAdmin()).toBe(false);
    });

    it('vergleicht Rollen case-sensitiv (kein Match bei abweichender Schreibweise)', () => {
      localStorage.setItem('Benutzer', JSON.stringify('Max'));
      localStorage.setItem('BenutzerRolle', JSON.stringify('Team-Admin'));
      localStorage.setItem('AccessToken', JSON.stringify('access-token'));
      expect(isAdmin()).toBe(false);
    });
  });
});
