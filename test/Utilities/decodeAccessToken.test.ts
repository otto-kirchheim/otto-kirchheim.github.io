import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getUserCookie, isAdmin } from '../../src/ts/utilities/decodeAccessToken';

describe('decodeAccessToken', () => {
  beforeEach(() => {
    // Cookies löschen
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
    });
  });

  afterEach(() => {
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
    });
  });

  describe('getUserCookie', () => {
    it('gibt null zurück wenn kein user-Cookie existiert', () => {
      expect(getUserCookie()).toBeNull();
    });

    it('liest user-Cookie korrekt', () => {
      const userData = { userName: 'Max', role: 'member' };
      document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/`;
      expect(getUserCookie()).toEqual(userData);
    });

    it('gibt null zurück bei ungültigem JSON im Cookie', () => {
      document.cookie = `user=${encodeURIComponent('kein-json{{')}; path=/`;
      expect(getUserCookie()).toBeNull();
    });

    it('liest Cookie auch mit anderen Cookies davor', () => {
      document.cookie = 'other=value; path=/';
      const userData = { userName: 'Test', role: 'super-admin' };
      document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/`;
      expect(getUserCookie()).toEqual(userData);
    });
  });

  describe('isAdmin', () => {
    it('gibt false zurück ohne Cookie', () => {
      expect(isAdmin()).toBe(false);
    });

    it('gibt false zurück für member', () => {
      document.cookie = `user=${encodeURIComponent(JSON.stringify({ userName: 'Max', role: 'member' }))}; path=/`;
      expect(isAdmin()).toBe(false);
    });

    it('gibt true zurück für team-admin', () => {
      document.cookie = `user=${encodeURIComponent(JSON.stringify({ userName: 'Max', role: 'team-admin' }))}; path=/`;
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für org-admin', () => {
      document.cookie = `user=${encodeURIComponent(JSON.stringify({ userName: 'Max', role: 'org-admin' }))}; path=/`;
      expect(isAdmin()).toBe(true);
    });

    it('gibt true zurück für super-admin', () => {
      document.cookie = `user=${encodeURIComponent(JSON.stringify({ userName: 'Max', role: 'super-admin' }))}; path=/`;
      expect(isAdmin()).toBe(true);
    });
  });
});
