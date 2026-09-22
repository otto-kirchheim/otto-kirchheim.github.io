/**
 * Sichtbarkeit der Hauptnavigation (Login-Zustand). `AppHeader.tsx` haengt dafuer reaktiv `d-none`
 * an `<DBControlPanelNavigation>` und die Einstellungen-/Admin-/Logout-Elemente in `actions2`;
 * geschrieben wird aus `auth/index.ts`, `loadUserDaten.ts` und `logoutUser.ts`.
 *
 * WICHTIG: Die Navigation wird IMMER gerendert, nur die Klasse wechselt -- nicht bedingt
 * (`{sichtbar && <Navigation>}`). der Admin-Toggle und
 * die Klick-Listener greifen per `querySelector` auf Nav-Kinder (`#admin-tab`,
 * `#bereitschaft-tab`, ...) zu, bevor `setNavigationSichtbar(true)` lief; bei bedingtem Rendern
 * gaebe es die Elemente dann noch nicht, die Aufrufe liefen ins Leere und wuerden nie wiederholt.
 *
 * Der Burger-Knopf bleibt bewusst immer sichtbar: `DBHeader` erzeugt ihn ohne Sichtbarkeits-Prop;
 * vor dem Login oeffnet er eine fast leere Schublade.
 */

type Listener = () => void;

let sichtbar = false;
const listeners = new Set<Listener>();

/**
 * Liefert die Sichtbarkeit der Hauptnavigation.
 *
 * @returns `true`, wenn die Navigation sichtbar ist (Standard: `false`).
 */
export function isNavigationSichtbar(): boolean {
  return sichtbar;
}

/**
 * Registriert einen Listener fuer Sichtbarkeits-Wechsel der Navigation.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeNavigationSichtbar(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt die Sichtbarkeit der Navigation und benachrichtigt die Listener; bei unveraendertem Wert passiert nichts.
 *
 * @param next - `true` blendet die Navigation ein.
 */
export function setNavigationSichtbar(next: boolean): void {
  if (next === sichtbar) return;
  sichtbar = next;
  for (const listener of listeners) listener();
}
