import Storage from '../../lib/storage/Storage';
import { Role, ROLE_HIERARCHY } from '@otto-kirchheim/nebengeld-shared';

export type UserCookieData = {
  userName: string;
  role: Role;
};

/**
 * Prüft, ob im Storage ein Access- oder Refresh-Token liegt.
 *
 * @returns `true`, wenn mindestens eines der beiden Tokens gespeichert ist.
 */
function hasStoredSessionToken(): boolean {
  return Storage.check('AccessToken') || Storage.check('RefreshToken');
}

/**
 * Liest User-Daten (role, userName) aus localStorage statt aus einem Cookie, das bei
 * Cross-Origin nicht per `document.cookie` zugaenglich waere.
 *
 * @returns Benutzername und Rolle; `null` ohne gespeichertes Token oder ohne gespeicherte Daten.
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
 * Prüft, ob der aktuelle Benutzer Admin ist, d.h. mindestens Team-Admin-Rang hat (alles außer
 * "member"). Die Rolle kommt aus `getUserCookie()`.
 *
 * @returns `true` bei Admin-Rang, `false` sonst oder ohne angemeldeten Benutzer.
 */
export function isAdmin(): boolean {
  const user = getUserCookie();
  return user ? ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[Role.TEAM_ADMIN] : false;
}
