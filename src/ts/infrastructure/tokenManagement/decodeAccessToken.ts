import Storage from '../storage/Storage';
import { Role, ROLE_HIERARCHY } from '@otto-kirchheim/nebengeld-shared';

export type UserCookieData = {
  userName: string;
  role: Role;
};

function hasStoredSessionToken(): boolean {
  return Storage.check('AccessToken') || Storage.check('RefreshToken');
}

/**
 * Liest User-Daten (role, userName) aus localStorage.
 * Frueher wurde das `user`-Cookie gelesen, das aber bei Cross-Origin
 * nicht per `document.cookie` zugaenglich ist.
 */
export function getUserCookie(): UserCookieData | null {
  if (!hasStoredSessionToken()) return null;

  if (Storage.check('Benutzer') && Storage.check('BenutzerRolle')) {
    return {
      userName: Storage.get<string>('Benutzer', true),
      role: Storage.get<Role>('BenutzerRolle', true),
    };
  }
  return null;
}

/**
 * Prüft, ob der aktuelle Benutzer eine Admin-Rolle hat.
 * Liest das `user`-Cookie.
 */
/** Admin = mindestens Team-Admin-Rang (alles außer "member"). */
export function isAdmin(): boolean {
  const user = getUserCookie();
  return user ? ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[Role.TEAM_ADMIN] : false;
}
