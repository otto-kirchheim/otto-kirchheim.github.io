import Storage from './Storage';

export type UserCookieData = {
  userName: string;
  role: string;
};

/** Admin-Rollen (alles außer "member") */
const ADMIN_ROLES = new Set(['team-admin', 'org-admin', 'super-admin']);

/**
 * Liest User-Daten (role, userName) aus localStorage.
 * Frueher wurde das `user`-Cookie gelesen, das aber bei Cross-Origin
 * nicht per `document.cookie` zugaenglich ist.
 */
export function getUserCookie(): UserCookieData | null {
  if (Storage.check('Benutzer') && Storage.check('BenutzerRolle')) {
    return {
      userName: Storage.get<string>('Benutzer', true),
      role: Storage.get<string>('BenutzerRolle', true),
    };
  }
  return null;
}

/**
 * Prüft, ob der aktuelle Benutzer eine Admin-Rolle hat.
 * Liest das `user`-Cookie.
 */
export function isAdmin(): boolean {
  const user = getUserCookie();
  return user ? ADMIN_ROLES.has(user.role) : false;
}
