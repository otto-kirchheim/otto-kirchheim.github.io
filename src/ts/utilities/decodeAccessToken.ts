export type UserCookieData = {
  userName: string;
  role: string;
};

/** Admin-Rollen (alles außer "member") */
const ADMIN_ROLES = new Set(['team-admin', 'org-admin', 'super-admin']);

/**
 * Liest das `user`-Cookie (nicht-HttpOnly, vom Server gesetzt).
 * Enthält { userName, role } als JSON.
 */
export function getUserCookie(): UserCookieData | null {
  const match = document.cookie.match(/(?:^|;\s*)user=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/**
 * Prüft, ob der aktuelle Benutzer eine Admin-Rolle hat.
 * Liest das `user`-Cookie.
 */
export function isAdmin(): boolean {
  const user = getUserCookie();
  return user ? ADMIN_ROLES.has(user.role) : false;
}
